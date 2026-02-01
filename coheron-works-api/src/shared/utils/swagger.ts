import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.0',
  info: {
    title: 'CoheronERP API',
    version: '1.0.0',
    description: 'Enterprise Resource Planning API — CRM, Sales, Inventory, Manufacturing, HR, Accounting, Projects, Support, Marketing, Admin, Compliance, and AI Copilot.',
    contact: { name: 'CoheronERP Team' },
    license: { name: 'Proprietary' },
  },
  servers: [{ url: '/api', description: 'API base' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT access token' },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } } },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication & authorization' },
    { name: 'CRM', description: 'Customer relationship management' },
    { name: 'Sales', description: 'Sales orders, invoices, pricing' },
    { name: 'Accounting', description: 'Journal entries, ledgers, tax, reports' },
    { name: 'Inventory', description: 'Products, stock, serial numbers, batches' },
    { name: 'Manufacturing', description: 'Manufacturing orders, BOM, shop floor' },
    { name: 'HR', description: 'Employees, payroll, attendance, leave' },
    { name: 'Projects', description: 'Project management, tasks, timesheets' },
    { name: 'Support', description: 'Helpdesk tickets, SLA, knowledge base' },
    { name: 'Marketing', description: 'Campaigns, analytics' },
    { name: 'Admin', description: 'Users, roles, SSO, tenant config' },
    { name: 'Compliance', description: 'GDPR, consent, DSAR' },
    { name: 'AI Copilot', description: 'AI-powered queries, insights, anomaly detection, forecasting' },
  ],
  paths: {
    // ========== Auth ==========
    '/auth/login': {
      post: { tags: ['Auth'], summary: 'Login', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } }, responses: { '200': { description: 'JWT tokens returned' }, '401': { description: 'Invalid credentials' } } },
    },
    '/auth/register': {
      post: { tags: ['Auth'], summary: 'Register new user', security: [], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'name'], properties: { email: { type: 'string' }, password: { type: 'string' }, name: { type: 'string' }, company_name: { type: 'string' } } } } } }, responses: { '201': { description: 'User created' } } },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Refresh access token', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refresh_token: { type: 'string' } } } } } }, responses: { '200': { description: 'New token pair' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Logout and invalidate tokens', responses: { '200': { description: 'Logged out' } } },
    },

    // ========== Sales ==========
    '/sale-orders': {
      get: { tags: ['Sales'], summary: 'List sale orders', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'limit', schema: { type: 'integer' } }, { in: 'query', name: 'status', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated sale orders' } } },
      post: { tags: ['Sales'], summary: 'Create sale order', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/sale-orders/{id}': {
      get: { tags: ['Sales'], summary: 'Get sale order by ID', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Sale order details' } } },
      put: { tags: ['Sales'], summary: 'Update sale order', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
      delete: { tags: ['Sales'], summary: 'Delete sale order', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
    },
    '/sale-orders/{id}/confirm': {
      post: { tags: ['Sales'], summary: 'Confirm sale order', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Confirmed' } } },
    },
    '/invoices': {
      get: { tags: ['Sales'], summary: 'List invoices', responses: { '200': { description: 'Paginated invoices' } } },
      post: { tags: ['Sales'], summary: 'Create invoice', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },

    // ========== Accounting ==========
    '/accounting/journal-entries': {
      get: { tags: ['Accounting'], summary: 'List journal entries', responses: { '200': { description: 'Paginated journal entries' } } },
      post: { tags: ['Accounting'], summary: 'Create journal entry', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/accounting/journal-entries/{id}/post': {
      post: { tags: ['Accounting'], summary: 'Post journal entry', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Posted' } } },
    },
    '/accounting/chart-of-accounts': {
      get: { tags: ['Accounting'], summary: 'List chart of accounts', responses: { '200': { description: 'Accounts list' } } },
      post: { tags: ['Accounting'], summary: 'Create account', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/accounting/accounts-payable': {
      get: { tags: ['Accounting'], summary: 'List accounts payable', responses: { '200': { description: 'AP list' } } },
    },
    '/accounting/accounts-receivable': {
      get: { tags: ['Accounting'], summary: 'List accounts receivable', responses: { '200': { description: 'AR list' } } },
    },

    // ========== Inventory ==========
    '/products': {
      get: { tags: ['Inventory'], summary: 'List products', parameters: [{ in: 'query', name: 'page', schema: { type: 'integer' } }, { in: 'query', name: 'search', schema: { type: 'string' } }], responses: { '200': { description: 'Paginated products' } } },
      post: { tags: ['Inventory'], summary: 'Create product', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/inventory/serial-numbers': {
      get: { tags: ['Inventory'], summary: 'List serial numbers', responses: { '200': { description: 'Serial numbers' } } },
      post: { tags: ['Inventory'], summary: 'Create serial number', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/inventory/batches': {
      get: { tags: ['Inventory'], summary: 'List batches', responses: { '200': { description: 'Batches' } } },
      post: { tags: ['Inventory'], summary: 'Create batch', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/inventory/reorder': {
      get: { tags: ['Inventory'], summary: 'Get reorder suggestions', responses: { '200': { description: 'Reorder list' } } },
    },
    '/inventory/shipping': {
      get: { tags: ['Inventory'], summary: 'List shipments', responses: { '200': { description: 'Shipments' } } },
    },

    // ========== HR ==========
    '/employees': {
      get: { tags: ['HR'], summary: 'List employees', responses: { '200': { description: 'Paginated employees' } } },
      post: { tags: ['HR'], summary: 'Create employee', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/employees/{id}': {
      get: { tags: ['HR'], summary: 'Get employee', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Employee details' } } },
      put: { tags: ['HR'], summary: 'Update employee', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
    },
    '/hr/self-service/profile': {
      get: { tags: ['HR'], summary: 'Get own profile (self-service)', responses: { '200': { description: 'Profile data' } } },
    },
    '/attendance': {
      get: { tags: ['HR'], summary: 'List attendance records', responses: { '200': { description: 'Attendance list' } } },
      post: { tags: ['HR'], summary: 'Record attendance', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/leave': {
      get: { tags: ['HR'], summary: 'List leave requests', responses: { '200': { description: 'Leave list' } } },
    },

    // ========== CRM ==========
    '/leads': {
      get: { tags: ['CRM'], summary: 'List leads', responses: { '200': { description: 'Paginated leads' } } },
      post: { tags: ['CRM'], summary: 'Create lead', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/leads/{id}': {
      get: { tags: ['CRM'], summary: 'Get lead', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Lead details' } } },
      put: { tags: ['CRM'], summary: 'Update lead', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
    },
    '/deals': {
      get: { tags: ['CRM'], summary: 'List deals', responses: { '200': { description: 'Paginated deals' } } },
      post: { tags: ['CRM'], summary: 'Create deal', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/pipelines': {
      get: { tags: ['CRM'], summary: 'List pipelines', responses: { '200': { description: 'Pipelines' } } },
    },
    '/crm/rfm': {
      get: { tags: ['CRM'], summary: 'RFM analysis', responses: { '200': { description: 'RFM segments' } } },
    },

    // ========== Manufacturing ==========
    '/manufacturing': {
      get: { tags: ['Manufacturing'], summary: 'List manufacturing orders', responses: { '200': { description: 'Manufacturing orders' } } },
      post: { tags: ['Manufacturing'], summary: 'Create manufacturing order', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/manufacturing/bom': {
      get: { tags: ['Manufacturing'], summary: 'List BOMs', responses: { '200': { description: 'BOMs' } } },
      post: { tags: ['Manufacturing'], summary: 'Create BOM', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/manufacturing/shop-floor/start': {
      post: { tags: ['Manufacturing'], summary: 'Start shop floor operation', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Started' } } },
    },
    '/manufacturing/mrp': {
      get: { tags: ['Manufacturing'], summary: 'Run MRP', responses: { '200': { description: 'MRP results' } } },
    },
    '/manufacturing/quality': {
      get: { tags: ['Manufacturing'], summary: 'List quality checks', responses: { '200': { description: 'Quality checks' } } },
    },

    // ========== Projects ==========
    '/projects': {
      get: { tags: ['Projects'], summary: 'List projects', responses: { '200': { description: 'Paginated projects' } } },
      post: { tags: ['Projects'], summary: 'Create project', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/projects/{id}': {
      get: { tags: ['Projects'], summary: 'Get project', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Project details' } } },
    },
    '/projects/{id}/tasks': {
      get: { tags: ['Projects'], summary: 'List project tasks', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Tasks' } } },
      post: { tags: ['Projects'], summary: 'Create task', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/projects/{id}/timesheets': {
      get: { tags: ['Projects'], summary: 'List timesheets', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Timesheets' } } },
    },

    // ========== Support ==========
    '/support-tickets': {
      get: { tags: ['Support'], summary: 'List support tickets', responses: { '200': { description: 'Tickets' } } },
      post: { tags: ['Support'], summary: 'Create ticket', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/support-tickets/{id}': {
      get: { tags: ['Support'], summary: 'Get ticket', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Ticket details' } } },
    },
    '/knowledge-base': {
      get: { tags: ['Support'], summary: 'List knowledge base articles', responses: { '200': { description: 'Articles' } } },
    },
    '/sla-policies': {
      get: { tags: ['Support'], summary: 'List SLA policies', responses: { '200': { description: 'SLAs' } } },
    },
    '/live-chat': {
      get: { tags: ['Support'], summary: 'List live chat sessions', responses: { '200': { description: 'Chat sessions' } } },
    },

    // ========== Marketing ==========
    '/campaigns': {
      get: { tags: ['Marketing'], summary: 'List campaigns', responses: { '200': { description: 'Campaigns' } } },
      post: { tags: ['Marketing'], summary: 'Create campaign', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/campaigns/{id}': {
      get: { tags: ['Marketing'], summary: 'Get campaign', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Campaign details' } } },
    },
    '/marketing/campaign-analytics/{id}': {
      get: { tags: ['Marketing'], summary: 'Get campaign analytics', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Analytics data' } } },
    },
    '/marketing': {
      get: { tags: ['Marketing'], summary: 'Marketing overview', responses: { '200': { description: 'Overview' } } },
    },

    // ========== Admin ==========
    '/rbac/roles': {
      get: { tags: ['Admin'], summary: 'List roles', responses: { '200': { description: 'Roles' } } },
      post: { tags: ['Admin'], summary: 'Create role', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/rbac/permissions': {
      get: { tags: ['Admin'], summary: 'List permissions', responses: { '200': { description: 'Permissions' } } },
    },
    '/admin/sso': {
      get: { tags: ['Admin'], summary: 'List SSO configurations', responses: { '200': { description: 'SSO configs' } } },
      post: { tags: ['Admin'], summary: 'Create SSO config', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },
    '/tenant-config': {
      get: { tags: ['Admin'], summary: 'Get tenant configuration', responses: { '200': { description: 'Config' } } },
      put: { tags: ['Admin'], summary: 'Update tenant configuration', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
    },
    '/admin/import': {
      post: { tags: ['Admin'], summary: 'Import data', requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Import result' } } },
    },

    // ========== Compliance ==========
    '/compliance': {
      get: { tags: ['Compliance'], summary: 'Compliance overview', responses: { '200': { description: 'Compliance status' } } },
    },
    '/consent': {
      get: { tags: ['Compliance'], summary: 'List consent records', responses: { '200': { description: 'Consent records' } } },
    },
    '/dsar': {
      get: { tags: ['Compliance'], summary: 'List DSAR requests', responses: { '200': { description: 'DSAR requests' } } },
      post: { tags: ['Compliance'], summary: 'Create DSAR request', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' } } },
    },

    // ========== AI Copilot ==========
    '/admin/ai/query': {
      post: { tags: ['AI Copilot'], summary: 'Submit natural language query', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['query_text'], properties: { query_text: { type: 'string', description: 'Natural language question' }, context: { type: 'object', properties: { module: { type: 'string' }, entity_type: { type: 'string' }, entity_id: { type: 'string' }, date_range: { type: 'object', properties: { start: { type: 'string', format: 'date' }, end: { type: 'string', format: 'date' } } } } } } } } } }, responses: { '200': { description: 'AI response with data' } } },
    },
    '/admin/ai/insights': {
      get: { tags: ['AI Copilot'], summary: 'Get AI-generated insights', parameters: [{ in: 'query', name: 'module', schema: { type: 'string' } }, { in: 'query', name: 'severity', schema: { type: 'string', enum: ['info', 'warning', 'critical'] } }], responses: { '200': { description: 'Paginated insights' } } },
    },
    '/admin/ai/anomalies': {
      get: { tags: ['AI Copilot'], summary: 'Run anomaly detection', parameters: [{ in: 'query', name: 'module', schema: { type: 'string', enum: ['sales', 'accounting', 'inventory', 'hr', 'crm'] } }], responses: { '200': { description: 'Detected anomalies' } } },
    },
    '/admin/ai/forecast/{module}': {
      get: { tags: ['AI Copilot'], summary: 'Get forecast data', parameters: [{ in: 'path', name: 'module', required: true, schema: { type: 'string' } }, { in: 'query', name: 'periods', schema: { type: 'integer', default: 6 } }], responses: { '200': { description: 'Forecast with historical data' } } },
    },
    '/admin/ai/recommendations/{module}': {
      get: { tags: ['AI Copilot'], summary: 'Get smart recommendations', parameters: [{ in: 'path', name: 'module', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Actionable recommendations' } } },
    },
    '/admin/ai/generate-insights': {
      post: { tags: ['AI Copilot'], summary: 'Trigger batch insight generation', responses: { '200': { description: 'Number of insights created' } } },
    },
    '/admin/ai/queries': {
      get: { tags: ['AI Copilot'], summary: 'Get query history', responses: { '200': { description: 'Paginated query history' } } },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
