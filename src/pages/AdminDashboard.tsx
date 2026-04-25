import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  MessageSquare, 
  Briefcase, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Shield,
  Menu,
  X,
  Activity,
  Zap,
  RefreshCw,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import '../App.css'

// Types
interface AdminUser {
  id: number;
  username: string;
  role: 'superadmin' | 'admin';
  email: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}

const StatCard = ({ title, value, icon: Icon, trend, color }: StatCardProps) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
  </div>
)

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // Login form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Dashboard state
  const [stats, setStats] = useState<any>(null)
  const [recentConsultations, setRecentConsultations] = useState<any[]>([])
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [testimonies, setTestimonies] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [siteSettings, setSiteSettings] = useState<any>({})
  const [aiLogs, setAiLogs] = useState<any[]>([])
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false)
  const [isTestimonyModalOpen, setIsTestimonyModalOpen] = useState(false)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  
  const [editingPost, setEditingPost] = useState<any>(null)
  const [editingTestimony, setEditingTestimony] = useState<any>(null)
  const [editingService, setEditingService] = useState<any>(null)
  const [editingUser, setEditingUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const savedUser = localStorage.getItem('admin_user')
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        setIsAuthenticated(true)
        fetchDashboardData(token)
      } catch (e) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
      }
    }
    setIsLoading(false)
  }, [])

  const fetchDashboardData = async (token: string) => {
    try {
      const [summaryRes, consultationsRes, blogRes, testimoniesRes, servicesRes, settingsRes, aiLogsRes] = await Promise.all([
        fetch('/api/admin/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/consultations?limit=50', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/blog-posts', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/testimonies', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/services', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/settings'),
        fetch('/api/admin/ai/logs', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (summaryRes.ok) setStats(await summaryRes.json())
      if (consultationsRes.ok) setRecentConsultations((await consultationsRes.json()).consultations || [])
      if (blogRes.ok) setBlogPosts((await blogRes.json()).posts || [])
      if (testimoniesRes.ok) setTestimonies((await testimoniesRes.json()).testimonies || [])
      if (servicesRes.ok) setServices((await servicesRes.json()).services || [])
      if (settingsRes.ok) setSiteSettings((await settingsRes.json()).settings || {})
      if (aiLogsRes.ok) setAiLogs((await aiLogsRes.json()).logs || [])
      
      // Fetch admin users for superadmin
      if (user?.role === 'superadmin') {
        const usersRes = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
        if (usersRes.ok) setAdminUsers((await usersRes.json()).users || [])
      }
      
    } catch (error) {
      console.error('Failed to fetch dashboard data', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      console.log('Attempting login for:', email)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      console.log('Response status:', response.status)
      const text = await response.text()
      console.log('Response text (first 100 chars):', text.substring(0, 100))
      
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('Failed to parse JSON response')
        toast.error('Server returned invalid data format')
        return
      }

      if (response.ok && data.success) {
        localStorage.setItem('admin_token', data.token)
        localStorage.setItem('admin_user', JSON.stringify(data.user))
        setUser(data.user)
        setIsAuthenticated(true)
        fetchDashboardData(data.token)
        toast.success('Welcome back, ' + data.user.username)
      } else {
        toast.error(data.error || 'Invalid credentials')
      }
    } catch (error) { 
      console.error('Login fetch error:', error)
      toast.error('Connection error') 
    } finally { 
      setIsLoading(false) 
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setIsAuthenticated(false)
    setUser(null)
    toast.info('Logged out successfully')
  }

  const handleBlogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const data = {
      title: formData.get('title'),
      excerpt: formData.get('excerpt'),
      content: formData.get('content'),
      category: formData.get('category'),
      author: formData.get('author'),
      imageUrl: formData.get('imageUrl'),
      publishedAt: formData.get('status') === 'published' ? new Date().toISOString() : null
    }
    const token = localStorage.getItem('admin_token')
    const url = editingPost ? `/api/blog-posts/${editingPost.id}` : '/api/blog-posts'
    const method = editingPost ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('Post saved'); setIsBlogModalOpen(false); fetchDashboardData(token!); }
    } catch (error) { toast.error('Error saving post') }
  }

  const handleTestimonySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const data = {
      name: formData.get('name'),
      location: formData.get('location'),
      quote: formData.get('quote'),
      active: formData.get('active') === 'on'
    }
    const token = localStorage.getItem('admin_token')
    const url = editingTestimony ? `/api/testimonies/${editingTestimony.id}` : '/api/testimonies'
    const method = editingTestimony ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('Testimony saved'); setIsTestimonyModalOpen(false); fetchDashboardData(token!); }
    } catch (error) { toast.error('Error saving testimony') }
  }

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      icon: formData.get('icon'),
      features: formData.get('features')?.toString().split('\n').filter(f => f.trim()) || [],
      active: formData.get('active') === 'on'
    }
    const token = localStorage.getItem('admin_token')
    const url = editingService ? `/api/services/${editingService.id}` : '/api/services'
    const method = editingService ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('Service saved'); setIsServiceModalOpen(false); fetchDashboardData(token!); }
    } catch (error) { toast.error('Error saving service') }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const data = {
      username: formData.get('username'),
      email: formData.get('email'),
      role: formData.get('role'),
      password: formData.get('password')
    }
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      })
      if (res.ok) { toast.success('User created'); setIsUserModalOpen(false); fetchDashboardData(token!); }
      else { const err = await res.json(); toast.error(err.error || 'Error creating user') }
    } catch (error) { toast.error('Error creating user') }
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget as HTMLFormElement)
    const settings: any = {}
    formData.forEach((value, key) => settings[key.toString()] = value)
    
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ settings })
      })
      if (res.ok) { toast.success('Settings updated'); fetchDashboardData(token!); }
    } catch (error) { toast.error('Error updating settings') }
  }

  const handleAIGenerate = async (topic?: string) => {
    setIsGenerating(true)
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ topic })
      })
      if (res.ok) {
        toast.success('AI post generated and published!')
        fetchDashboardData(token!)
      } else {
        const err = await res.json()
        toast.error(err.error || 'AI Generation failed')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#f8a4b9]"></div></div>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f8a4b9]/10 mb-4"><Shield className="w-8 h-8 text-[#f8a4b9]" /></div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-500 mt-2">GEB Surrogacy Management System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div><label className="text-sm font-semibold text-gray-700 block mb-2">Email Address</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="pr-10"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 bg-[#f8a4b9] hover:bg-[#e88aa3] text-white">Sign In</Button>
          </form>
        </div>
      </div>
    )
  }

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'blog', label: 'Blog Posts', icon: FileText },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { id: 'services', label: 'Services', icon: Briefcase },
    { id: 'consultations', label: 'Consultations', icon: Calendar },
    { id: 'ai', label: 'AI Automation', icon: Activity, superadminOnly: true },
    { id: 'users', label: 'User Management', icon: Users, superadminOnly: true },
    { id: 'settings', label: 'Site Settings', icon: Settings, superadminOnly: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-30`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <span className="font-bold text-xl text-gray-900">GEB CMS</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">{isSidebarOpen ? <X /> : <Menu />}</button>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => {
            if (item.superadminOnly && user?.role !== 'superadmin') return null;
            const Icon = item.icon; const isActive = activeTab === item.id
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-[#f8a4b9]/10 text-[#f8a4b9]' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#f8a4b9]' : 'text-gray-400'}`} />
                {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t"><button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50"><LogOut className="w-5 h-5" />{isSidebarOpen && <span className="font-medium text-sm">Logout</span>}</button></div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="bg-white border-b border-gray-200 h-16 px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user?.username}</p>
                <p className="text-xs text-gray-500 uppercase">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#f8a4b9] flex items-center justify-center text-white font-bold">{user?.username?.[0]?.toUpperCase()}</div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Consultations" value={stats?.consultations ?? '...'} icon={Calendar} color="bg-blue-500" />
                <StatCard title="Blog Posts" value={stats?.blogPosts ?? '...'} icon={FileText} color="bg-purple-500" />
                <StatCard title="Testimonials" value={stats?.testimonials ?? '...'} icon={MessageSquare} color="bg-pink-500" />
                <StatCard title="Visitors" value={stats?.visitors ?? '...'} icon={Globe} color="bg-orange-500" />
              </div>
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-bold mb-4">Recent Consultations</h3>
                <table className="w-full text-left">
                  <thead><tr className="text-xs text-gray-500 uppercase"><th>Name</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentConsultations.map((c, i) => (
                      <tr key={i} className="border-t text-sm">
                        <td className="py-3">{c.first_name} {c.last_name}</td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold">Blog Management ({blogPosts.length})</h3>
                <Button className="bg-[#f8a4b9]" onClick={() => { setEditingPost(null); setIsBlogModalOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Post</Button>
              </div>
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="px-6 py-3">Title</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {blogPosts.map(p => (
                    <tr key={p.id} className="text-sm">
                      <td className="px-6 py-4 truncate max-w-xs">{p.title}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold">{p.category}</span></td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.published_at ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{p.published_at ? 'Published' : 'Draft'}</span></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingPost(p); setIsBlogModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => { if(confirm('Delete?')) { const token = localStorage.getItem('admin_token'); await fetch(`/api/blog-posts/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); fetchDashboardData(token!); } }}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 bg-white rounded-2xl border p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-bold text-xl">AI Automation Center</h3>
                      <p className="text-sm text-gray-500 mt-1">Configure and monitor your AI content generator.</p>
                    </div>
                    <div className="flex gap-2">
                       <Button 
                        disabled={isGenerating} 
                        onClick={() => handleAIGenerate()}
                        className="bg-[#f8a4b9] hover:bg-[#e88aa3]"
                       >
                        {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                        Generate Post Now
                       </Button>
                    </div>
                  </div>

                  <form onSubmit={handleSettingsSubmit} className="space-y-6 border-t pt-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">AI Provider</label>
                        <select name="ai_provider" defaultValue={siteSettings.ai_provider || 'gemini'} className="w-full h-10 px-3 rounded border border-gray-200">
                          <option value="gemini">Google Gemini</option>
                          <option value="openai">OpenAI (GPT-3.5/4)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Key</label>
                        <Input type="password" name="ai_api_key" defaultValue={siteSettings.ai_api_key} placeholder="Enter your API Key" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Topics (Comma separated)</label>
                      <Input name="ai_topics" defaultValue={siteSettings.ai_topics} placeholder="Surrogacy, IVF, Parenthood..." />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <input type="checkbox" name="ai_auto_posting" defaultChecked={siteSettings.ai_auto_posting === 'enabled'} />
                      <label className="text-sm font-medium">Enable Daily Auto-Posting</label>
                    </div>
                    <Button type="submit" variant="outline">Save AI Configuration</Button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Automation Activity
                  </h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {aiLogs.length === 0 && <p className="text-xs text-gray-500 italic">No activity recorded yet.</p>}
                    {aiLogs.map((log: any) => (
                      <div key={log.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status}
                          </span>
                          <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-bold truncate">{log.action.toUpperCase()}: {log.topic}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'testimonials' && (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold">Testimonials ({testimonies.length})</h3>
                <Button className="bg-[#f8a4b9]" onClick={() => { setEditingTestimony(null); setIsTestimonyModalOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Testimony</Button>
              </div>
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="px-6 py-3">Name</th><th className="px-6 py-3">Location</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {testimonies.map(t => (
                    <tr key={t.id} className="text-sm">
                      <td className="px-6 py-4">{t.name}</td>
                      <td className="px-6 py-4">{t.location}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>{t.active ? 'Active' : 'Hidden'}</span></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingTestimony(t); setIsTestimonyModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => { if(confirm('Delete?')) { const token = localStorage.getItem('admin_token'); await fetch(`/api/testimonies/${t.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); fetchDashboardData(token!); } }}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold">Agency Services ({services.length})</h3>
                <Button className="bg-[#f8a4b9]" onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
              </div>
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="px-6 py-3">Title</th><th className="px-6 py-3">Icon</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {services.map(s => (
                    <tr key={s.id} className="text-sm">
                      <td className="px-6 py-4 font-bold">{s.title}</td>
                      <td className="px-6 py-4">{s.icon}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.active ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>{s.active ? 'Active' : 'Hidden'}</span></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'consultations' && (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold">Consultation Requests</h3>
                <Button variant="outline" size="sm" onClick={() => { const token = localStorage.getItem('admin_token'); window.open(`/api/consultations/csv?token=${token}`, '_blank'); }}>Export CSV</Button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentConsultations.map(c => (
                    <tr key={c.id} className="text-sm">
                      <td className="px-6 py-4"><div>{c.first_name} {c.last_name}</div><div className="text-xs text-gray-500">{c.email} | {c.phone}</div></td>
                      <td className="px-6 py-4 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-xs">{c.location}</td>
                      <td className="px-6 py-4">
                        <select defaultValue={c.status} onChange={async (e) => { const token = localStorage.getItem('admin_token'); await fetch(`/api/consultations/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ status: e.target.value }) }); fetchDashboardData(token!); }} className="text-[10px] font-bold uppercase p-1 rounded border">
                          <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => alert(`Message: ${c.message}`)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => { if(confirm('Delete?')) { const token = localStorage.getItem('admin_token'); await fetch(`/api/consultations/${c.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); fetchDashboardData(token!); } }}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && user?.role === 'superadmin' && (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold">Admin Users</h3>
                <Button className="bg-[#f8a4b9]" onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add User</Button>
              </div>
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="px-6 py-3">User</th><th className="px-6 py-3">Role</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {adminUsers.map(u => (
                    <tr key={u.id} className="text-sm">
                      <td className="px-6 py-4"><div>{u.username}</div><div className="text-xs text-gray-500">{u.email}</div></td>
                      <td className="px-6 py-4 capitalize">{u.role}</td>
                      <td className="px-6 py-4 text-right">
                        {u.id !== 1 && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => { if(confirm('Delete user?')) { const token = localStorage.getItem('admin_token'); await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); fetchDashboardData(token!); } }}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'settings' && user?.role === 'superadmin' && (
            <div className="bg-white rounded-2xl border p-8 max-w-4xl">
              <h3 className="font-bold text-xl mb-8">General Site Settings</h3>
              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div><label className="text-sm font-medium">Company Name</label><Input name="company_name" defaultValue={siteSettings.company_name} /></div>
                  <div><label className="text-sm font-medium">Contact Email</label><Input name="contact_email" defaultValue={siteSettings.contact_email} /></div>
                  <div><label className="text-sm font-medium">Contact Phone (NG)</label><Input name="contact_phone" defaultValue={siteSettings.contact_phone} /></div>
                  <div><label className="text-sm font-medium">WhatsApp Number</label><Input name="whatsapp_number" defaultValue={siteSettings.whatsapp_number} /></div>
                  <div><label className="text-sm font-medium">UK Phone</label><Input name="uk_phone" defaultValue={siteSettings.uk_phone} /></div>
                  <div><label className="text-sm font-medium">USA Phone</label><Input name="usa_phone" defaultValue={siteSettings.usa_phone} /></div>
                  <div><label className="text-sm font-medium">Consultation Fee</label><Input name="consultation_fee" defaultValue={siteSettings.consultation_fee} /></div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div><label className="text-sm font-medium">Address (Nigeria)</label><Textarea name="address_nigeria" defaultValue={siteSettings.address_nigeria} /></div>
                  <div><label className="text-sm font-medium">Address (UK)</label><Textarea name="address_uk" defaultValue={siteSettings.address_uk} /></div>
                  <div><label className="text-sm font-medium">Address (USA)</label><Textarea name="address_usa" defaultValue={siteSettings.address_usa} /></div>
                </div>
                
                <h3 className="font-bold text-lg mt-8 mb-4">AI Configuration</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium">AI Provider</label>
                    <select name="ai_provider" defaultValue={siteSettings.ai_provider} className="w-full h-10 px-3 rounded border">
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>
                  <div><label className="text-sm font-medium">AI API Key</label><Input name="ai_api_key" type="password" defaultValue={siteSettings.ai_api_key} placeholder="Enter your key" /></div>
                  <div className="col-span-2"><label className="text-sm font-medium">AI Topics (Comma separated)</label><Textarea name="ai_topics" defaultValue={siteSettings.ai_topics} /></div>
                </div>

                <div className="flex justify-end pt-6"><Button type="submit" className="bg-[#f8a4b9]">Save All Settings</Button></div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <Dialog open={isBlogModalOpen} onOpenChange={setIsBlogModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPost ? 'Edit Blog' : 'New Blog'}</DialogTitle></DialogHeader>
          <form onSubmit={handleBlogSubmit} className="space-y-4">
            <Input name="title" defaultValue={editingPost?.title} placeholder="Title" required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Author</label>
                <Input name="author" defaultValue={editingPost?.author || user?.username} placeholder="Author" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Category</label>
                <select name="category" defaultValue={editingPost?.category || 'Surrogacy'} className="w-full h-10 px-3 rounded border text-sm">
                  {['Surrogacy', 'Parenthood', 'IVF', 'Egg Donation', 'Legal', 'Health'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Status</label>
                <select name="status" defaultValue={editingPost?.published_at ? 'published' : 'draft'} className="w-full h-10 px-3 rounded border text-sm">
                  <option value="draft">Draft</option><option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Image URL</label>
                <Input name="imageUrl" defaultValue={editingPost?.image_url} placeholder="Image URL" />
              </div>
            </div>
            <Textarea name="excerpt" defaultValue={editingPost?.excerpt} placeholder="Excerpt" />
            <Textarea name="content" defaultValue={editingPost?.content} placeholder="Content" rows={10} required />
            <DialogFooter><Button type="submit" className="bg-[#f8a4b9]">Save Post</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTestimonyModalOpen} onOpenChange={setIsTestimonyModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTestimony ? 'Edit Testimony' : 'New Testimony'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTestimonySubmit} className="space-y-4">
            <Input name="name" defaultValue={editingTestimony?.name} placeholder="Name" required />
            <Input name="location" defaultValue={editingTestimony?.location} placeholder="Location" />
            <Textarea name="quote" defaultValue={editingTestimony?.quote} placeholder="Quote" required />
            <div className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={editingTestimony?.active !== 0} /> <label>Visible on landing page</label></div>
            <DialogFooter><Button type="submit" className="bg-[#f8a4b9]">Save Testimony</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingService ? 'Edit Service' : 'New Service'}</DialogTitle></DialogHeader>
          <form onSubmit={handleServiceSubmit} className="space-y-4">
            <Input name="title" defaultValue={editingService?.title} placeholder="Service Title" required />
            <Input name="icon" defaultValue={editingService?.icon} placeholder="Icon name (lucide)" />
            <Textarea name="description" defaultValue={editingService?.description} placeholder="Description" required />
            <Textarea name="features" defaultValue={editingService?.features?.join('\n')} placeholder="Features (one per line)" />
            <div className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={editingService?.active !== 0} /> <label>Active</label></div>
            <DialogFooter><Button type="submit" className="bg-[#f8a4b9]">Save Service</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Admin</DialogTitle></DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <Input name="username" placeholder="Username" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <select name="role" className="w-full h-10 px-3 rounded border" defaultValue="admin">
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <DialogFooter><Button type="submit" className="bg-[#f8a4b9]">Create User</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
