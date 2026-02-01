import { useState, useEffect } from 'react';
import { Book, Search, FileText } from 'lucide-react';
import { apiService } from '../../services/apiService';
import './Policies.css';

export const Policies = () => {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await apiService.get<any>('/policies');
            setPolicies(data);
        } finally {
            setLoading(false);
        }
    };

    const filteredPolicies = policies.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="policies-page p-6">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold mb-2">Company Policies</h1>
                    <p className="text-gray-500">Access the company handbook and guidelines</p>
                </div>

                <div className="mb-8 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search policies..."
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid gap-4">
                    {filteredPolicies.map((policy, idx) => (
                        <div key={policy.id || (policy as any)._id || idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                                    <Book size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{policy.name}</h3>
                                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                            {policy.category}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm line-clamp-2">{policy.body}</p>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                        <FileText size={12} />
                                        <span>Updated {new Date(policy.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
