import { useState } from 'react';
import { Check, CreditCard, Zap, TrendingUp, Building2, Crown } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { showToast } from '../components/Toast';
import './Subscription.css';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  userLimit: string;
}

export const Subscription: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: billingInterval === 'month' ? 23300 : 193400,
      interval: billingInterval,
      userLimit: 'Up to 15 users',
      features: [
        'All 11 core modules (CRM, Sales, Inventory, Accounting, HR, Projects, Support, Manufacturing, Marketing, POS, Website)',
        '25GB storage',
        'Email support (business hours)',
        'Basic reporting & dashboards',
        'Mobile app access',
        'Standard integrations (5 integrations)',
        'Basic API access (1,000 calls/month)',
        'Data backup & recovery',
      ],
      icon: <Zap size={24} />,
    },
    {
      id: 'growth',
      name: 'Growth',
      price: billingInterval === 'month' ? 68800 : 571000,
      interval: billingInterval,
      userLimit: 'Up to 50 users',
      features: [
        'Everything in Starter, plus:',
        '100GB storage',
        'Priority email support (extended hours)',
        'Advanced reporting & analytics',
        'Custom dashboards',
        'Unlimited integrations',
        'Enhanced API access (10,000 calls/month)',
        'Advanced workflow automation',
        'Multi-warehouse inventory management',
        'Advanced HR features (payroll, advanced recruitment)',
        'Marketing automation tools',
        'Custom fields & forms',
      ],
      icon: <TrendingUp size={24} />,
      popular: true,
    },
    {
      id: 'scale',
      name: 'Scale',
      price: billingInterval === 'month' ? 114000 : 946000,
      interval: billingInterval,
      userLimit: 'Up to 100 users',
      features: [
        'Everything in Growth, plus:',
        '250GB storage',
        'Priority phone & email support (24/5)',
        'Advanced analytics & BI tools',
        'Custom reporting builder',
        'White-label options',
        'Unlimited API access',
        'Advanced security features (SSO, 2FA, IP restrictions)',
        'Advanced manufacturing (multi-level BOM, routing)',
        'Advanced accounting (multi-currency, multi-company)',
        'Dedicated onboarding specialist',
        'Quarterly business reviews',
      ],
      icon: <Building2 size={24} />,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingInterval === 'month' ? 0 : 0, // Custom pricing
      interval: billingInterval,
      userLimit: 'Greater than 100 users',
      features: [
        'Everything in Scale, plus:',
        'Unlimited users',
        'Unlimited storage',
        '24/7 dedicated support (phone, email, chat)',
        'Dedicated account manager',
        'Custom development & integrations',
        'On-premise deployment option',
        'Advanced compliance & audit trails',
        'Multi-tenant architecture',
        'Custom SLA guarantees (99.99% uptime)',
        'Advanced data governance',
        'Custom training & onboarding programs',
        'Quarterly strategy sessions',
        'Sandbox environment for testing',
        'Advanced backup & disaster recovery',
      ],
      icon: <Crown size={24} />,
    },
  ];

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);
    // Simulate subscription process
    setTimeout(() => {
      setLoading(false);
      showToast(`Subscription to ${plans.find((p) => p.id === planId)?.name} plan initiated!`, 'success');
    }, 1500);
  };

  return (
    <div className="subscription-page">
      <div className="container">
        <div className="subscription-header">
          <h1>Choose Your Plan</h1>
          <p className="subscription-subtitle">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="billing-toggle">
          <button
            className={billingInterval === 'month' ? 'active' : ''}
            onClick={() => setBillingInterval('month')}
          >
            Monthly
          </button>
          <button
            className={billingInterval === 'year' ? 'active' : ''}
            onClick={() => setBillingInterval('year')}
          >
            Yearly
            <span className="discount-badge">Save 17%</span>
          </button>
        </div>

        <div className="plans-grid">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`plan-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <div className="plan-header">
                <div className="plan-icon">{plan.icon}</div>
                <h2>{plan.name}</h2>
                <p className="plan-user-limit">{plan.userLimit}</p>
              </div>
              <div className="plan-pricing">
                {plan.id === 'enterprise' ? (
                  <span className="price">Custom</span>
                ) : (
                  <>
                    <span className="price">₹{plan.price.toLocaleString('en-IN')}</span>
                    <span className="interval">/{plan.interval}</span>
                  </>
                )}
              </div>
              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <Check size={18} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="subscribe-btn"
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading && selectedPlan === plan.id}
              >
                {loading && selectedPlan === plan.id ? (
                  <>
                    <LoadingSpinner size="small" />
                    Processing...
                  </>
                ) : plan.id === 'enterprise' ? (
                  <>
                    <Crown size={18} />
                    Contact Sales
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Subscribe
                  </>
                )}
              </Button>
            </Card>
          ))}
        </div>

        <div className="subscription-info">
          <Card className="info-card">
            <h3>All plans include:</h3>
            <ul>
              <li>✓ Secure cloud hosting</li>
              <li>✓ Regular updates & new features</li>
              <li>✓ Mobile app access</li>
              <li>✓ Data backup & recovery</li>
              <li>✓ 99.9% uptime SLA</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
