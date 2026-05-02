import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  ArrowRight, 
  Clock, 
  Globe, 
  Heart,
  Calendar,
  Filter
} from 'lucide-react'
import SEO from '@/components/SEO'
import AdSenseZone from '@/components/AdSenseZone'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const CATEGORIES = ['All', 'Surrogacy', 'Parenthood', 'IVF', 'Egg Donation', 'Legal', 'Health', 'Fictional Story']

const Blog = () => {
  const [posts, setPosts] = useState<any[]>([])
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/blog-posts')
        if (res.ok) {
          const data = await res.json()
          setPosts(data.posts || [])
          setFilteredPosts(data.posts || [])
        }
      } catch (e) {
        console.error('Error fetching posts')
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let result = posts
    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory)
    }
    if (searchQuery) {
      result = result.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    setFilteredPosts(result)
  }, [activeCategory, searchQuery, posts])

  const featuredPost = posts.length > 0 ? posts[0] : null

  return (
    <div className="min-h-screen bg-[#fcfafb]">
      <SEO 
        title="Surrogacy & IVF Insights"
        description="Explore our library of educational content, stories of joy, and expert guidance on surrogacy and parenthood."
      />

      {/* Hero Section */}
      <section className="bg-white border-b border-[#f0e7ec] pt-32 pb-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#f8a4b9]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-[#f8a4b9]/5 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#f8a4b9] transition-colors text-sm font-medium group">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#ffeef2] transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" />
              </div>
              Back to Home
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                <Globe className="w-4 h-4 text-[#f8a4b9]" />
                <span className="text-sm font-medium text-[#e88aa3]">Our Insights</span>
              </div>
              <h1 className="text-3xl md:text-6xl font-serif font-bold text-[#2d2d2d] mb-6 leading-tight">
                Empowering Your Journey to <span className="text-[#f8a4b9]">Parenthood</span>
              </h1>
              <p className="text-base md:text-lg text-[#666666] leading-relaxed">
                Stay informed with the latest news, expert advice, and heartfelt stories from the world of surrogacy and IVF.
              </p>
            </div>
            
            <div className="w-full md:w-96">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#f8a4b9] transition-colors" />
                <Input 
                  placeholder="Search articles..." 
                  className="pl-12 h-14 rounded-2xl border-[#f0e7ec] focus:ring-[#f8a4b9] focus:border-[#f8a4b9]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Featured Post */}
          {!searchQuery && activeCategory === 'All' && featuredPost && (
            <Link to={`/blog/${featuredPost.id}`}>
              <div className="group relative bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-[#f0e7ec] transition-all hover:shadow-2xl flex flex-col lg:flex-row">
                <div className="lg:w-1/2 h-[300px] lg:h-[500px] overflow-hidden">
                  <img 
                    src={featuredPost.image_url || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=1200'} 
                    alt={featuredPost.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="px-4 py-1.5 bg-[#ffeef2] text-[#e88aa3] text-xs font-bold rounded-full uppercase tracking-widest">{featuredPost.category}</span>
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> 5 min read
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#2d2d2d] mb-6 group-hover:text-[#f8a4b9] transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-gray-500 text-lg mb-8 line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[#f8a4b9]/10 rounded-full flex items-center justify-center font-bold text-[#f8a4b9]">
                         {featuredPost.author?.[0]}
                       </div>
                       <div className="text-sm">
                         <p className="font-bold text-[#2d2d2d]">{featuredPost.author}</p>
                         <p className="text-gray-400">{new Date(featuredPost.published_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <span className="text-[#f8a4b9] font-bold flex items-center gap-2 group-hover:gap-3 transition-all">
                      Read Article <ArrowRight className="w-5 h-5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Filter & Main Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex items-center gap-2 text-gray-400 mr-4">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Filter:</span>
            </div>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat 
                    ? 'bg-[#f8a4b9] text-white shadow-lg shadow-[#f8a4b9]/20' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-[#f0e7ec]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Ad Zone */}
          <AdSenseZone slot="blog_list_top" className="mb-16" />

          {/* Posts Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[1,2,3,4,5,6].map(i => <div key={i} className="h-[450px] bg-white rounded-[2rem] animate-pulse shadow-sm border border-gray-100" />)}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
              {filteredPosts.map((post, index) => (
                <article key={post.id} className="group flex flex-col">
                  <Link to={`/blog/${post.id}`} className="block overflow-hidden rounded-[2.5rem] aspect-[4/3] mb-6 relative shadow-lg">
                    <img 
                      src={post.image_url || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800'} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="bg-white text-black px-6 py-2 rounded-full font-bold shadow-xl">Read More</span>
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur text-gray-900 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                        {post.category}
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4 mb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.published_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 5 min read</span>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[#2d2d2d] mb-4 group-hover:text-[#f8a4b9] transition-colors line-clamp-2 leading-tight">
                    <Link to={`/blog/${post.id}`}>{post.title}</Link>
                  </h3>
                  <p className="text-gray-500 text-sm mb-6 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <Link 
                    to={`/blog/${post.id}`} 
                    className="mt-auto inline-flex items-center gap-2 text-[#f8a4b9] font-bold text-sm hover:gap-3 transition-all"
                  >
                    Read Full Story <ArrowRight className="w-4 h-4" />
                  </Link>
                  
                  {/* Insert Ad every 6 posts */}
                  {(index + 1) % 6 === 0 && <AdSenseZone slot="blog_grid_mid" className="col-span-full mt-12" />}
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Search className="w-8 h-8 text-gray-300" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
               <p className="text-gray-500 mb-8">Try adjusting your filters or search keywords.</p>
               <Button onClick={() => { setActiveCategory('All'); setSearchQuery(''); }} className="bg-[#f8a4b9] hover:bg-[#e88aa3]">Clear Filters</Button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="py-20 bg-[#f8a4b9]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Heart className="w-12 h-12 text-white/50 mx-auto mb-8" />
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">Join our community</h2>
          <p className="text-white/80 text-lg mb-10">
            Subscribe to receive heartwarming stories and expert advice delivered straight to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
             <Input placeholder="Your email address" className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-14 rounded-2xl" />
             <Button className="bg-white text-[#f8a4b9] hover:bg-white/90 h-14 rounded-2xl font-bold px-8">Subscribe</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Blog;
