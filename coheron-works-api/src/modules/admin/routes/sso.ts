import crypto from 'node:crypto';
import express, { Request, Response } from 'express';
import passport from 'passport';
import jwt, { SignOptions } from 'jsonwebtoken';
import { SSOProvider, ISSOProvider } from '../../../models/SSOProvider.js';
import User from '../../../shared/models/User.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../../shared/middleware/permissions.js';
import { getJwtSecret, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '../../../shared/utils/auth-config.js';
import { buildOAuthStrategy, buildGoogleStrategy, buildSAMLStrategy, getSSOProviders } from '../../../shared/auth/ssoConfig.js';
import logger from '../../../shared/utils/logger.js';

const router = express.Router();
router.use(passport.initialize());

function generateTokenPair(payload: Record<string, any>) {
  const jti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();
  const accessToken = jwt.sign({ ...payload, jti }, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY } as SignOptions);
  const refreshToken = jwt.sign({ ...payload, jti: refreshJti, type: 'refresh' }, getJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY } as SignOptions);
  return { accessToken, refreshToken, jti, refreshJti };
}
// GET / - List SSO providers for tenant
router.get('/', requirePermission('admin:sso:read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const providers = await SSOProvider.find({ tenant_id: tenantId }).select('-client_secret -saml_cert');
  res.json({ data: providers });
}));

// POST / - Create SSO provider config
router.post('/', requirePermission('admin:sso:write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const provider = new SSOProvider({ ...req.body, tenant_id: tenantId });
  await provider.save();
  res.status(201).json({ data: provider });
}));
// PUT /:id
router.put('/:id', requirePermission('admin:sso:write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const provider = await SSOProvider.findOneAndUpdate(
    { _id: req.params.id, tenant_id: tenantId },
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!provider) return res.status(404).json({ error: 'SSO provider not found' });
  res.json({ data: provider });
}));

// DELETE /:id
router.delete('/:id', requirePermission('admin:sso:write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const provider = await SSOProvider.findOneAndDelete({ _id: req.params.id, tenant_id: tenantId });
  if (!provider) return res.status(404).json({ error: 'SSO provider not found' });
  res.json({ message: 'SSO provider deleted' });
}));
function extractProfileData(provider: ISSOProvider, profile: any): { email: string; name: string } {
  const mapping = provider.attribute_mapping || { email: 'email', name: 'name', first_name: 'given_name', last_name: 'family_name' };
  function getVal(obj: any, p: string): any {
    if (!p) return undefined;
    if (obj.emails && p === 'email') return obj.emails?.[0]?.value || obj.email;
    if (obj.displayName && p === 'name') return obj.displayName || obj.name;
    return p.split('.').reduce((o: any, k: string) => o?.[k], obj);
  }
  const email = getVal(profile, mapping.email) || profile.email || profile.nameID;
  const name = getVal(profile, mapping.name) || profile.displayName || profile.name ||
    [getVal(profile, mapping.first_name), getVal(profile, mapping.last_name)].filter(Boolean).join(' ');
  return { email, name };
}

async function findOrCreateSSOUser(provider: ISSOProvider, profileData: { email: string; name: string }) {
  const email = profileData.email?.toLowerCase();
  if (!email) throw new Error('No email returned from SSO provider');
  let user = await User.findOne({ email, tenant_id: provider.tenant_id });
  if (!user && provider.auto_create_users) {
    const randomPwd = crypto.randomBytes(32).toString('hex');
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(randomPwd, 12);
    const lastUser = await User.findOne().sort({ uid: -1 });
    const nextUid = (lastUser?.uid || 0) + 1;
    user = new User({
      uid: nextUid, name: profileData.name || email.split('@')[0], email,
      password_hash: passwordHash, tenant_id: provider.tenant_id,
      role_id: provider.default_role_id || undefined, active: true,
    });
    await user.save();
    logger.info({ email, tenantId: provider.tenant_id }, 'Auto-created user via SSO');
  }
  return user;
}
function registerStrategy(sp: ISSOProvider, tid: string) {
  const sname="sso-"+tid+"-"+sp.provider_name;
  if(sp.provider_name==="google"){
    passport.use(sname,buildGoogleStrategy(sp,(_a:string,_r:string,p:any,d:any)=>d(null,p)));
  }else if(sp.provider_name==="custom_saml"){
    passport.use(sname,buildSAMLStrategy(sp,(p:any,d:any)=>d(null,p)) as any);
  }else{
    passport.use(sname,buildOAuthStrategy(sp,(_a:string,_r:string,p:any,d:any)=>d(null,p)));
  }
  return sname;
}
// GET /auth/:provider - Initiate SSO login
router.get("/auth/:provider",asyncHandler(async(req:Request,res:Response)=>{
  const tenantId=req.query.tenant_id as string;
  if(!tenantId) return res.status(400).json({error:"tenant_id query param required"});
  const sp=await SSOProvider.findOne({tenant_id:tenantId,provider_name:req.params.provider,enabled:true});
  if(!sp) return res.status(404).json({error:"SSO provider not configured or disabled"});
  const sn=registerStrategy(sp,tenantId);
  passport.authenticate(sn,{session:false,state:tenantId} as any)(req,res,()=>{});
}));
// SSO callback handler
const handleCallback=asyncHandler(async(req:Request,res:Response)=>{
  const tenantId=(req.query.state||req.body?.RelayState||req.query.tenant_id) as string;
  if(!tenantId) return res.status(400).json({error:"Missing tenant context"});
  const sp=await SSOProvider.findOne({tenant_id:tenantId,provider_name:req.params.provider,enabled:true});
  if(!sp) return res.status(404).json({error:"SSO provider not found"});
  const sn=registerStrategy(sp,tenantId);  passport.authenticate(sn,{session:false},async(err:any,profile:any)=>{
    try{
      if(err||!profile){
        logger.error({err,provider:req.params.provider},"SSO authentication failed");
        return res.status(401).json({error:"SSO authentication failed",details:err?.message});
      }
      const profileData=extractProfileData(sp,profile);
      const user=await findOrCreateSSOUser(sp,profileData);
      if(!user) return res.status(403).json({error:"No account found for this email. Contact your administrator."});
      if(!user.active) return res.status(403).json({error:"Account is disabled"});      user.last_login_at=new Date();
      user.last_login_ip=req.ip||"";
      user.last_login_user_agent=req.get("user-agent")||"";
      await user.save();
      const{accessToken,refreshToken}=generateTokenPair({
        userId:user._id,uid:user.uid,email:user.email,tenant_id:user.tenant_id,
      });
      const frontendUrl=process.env.SSO_FRONTEND_REDIRECT_URL;
      if(frontendUrl){
        const u=new URL(frontendUrl);
        u.searchParams.set("access_token",accessToken);
        u.searchParams.set("refresh_token",refreshToken);
        return res.redirect(u.toString());
      }
      res.json({
        access_token:accessToken,refresh_token:refreshToken,
        user:{id:user._id,uid:user.uid,name:user.name,email:user.email},
      });
    }catch(error:any){
      logger.error({error},"SSO callback processing error");
      res.status(500).json({error:"SSO callback processing failed"});
    }
  })(req,res,()=>{});
});
router.get("/auth/:provider/callback",handleCallback);
router.post("/auth/:provider/callback",handleCallback);

export default router;
