import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Tag, Share2 } from 'lucide-react'
import SEO from '@/components/SEO'
import AdSenseZone from '@/components/AdSenseZone'
import { Button } from '@/components/ui/button'

const BlogPost = () => {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog-posts/${id}`)
        if (res.ok) {
          const data = await res.json()
          setPost(data)
        }
      } catch (e) {
        console.error('Error fetching post')
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
    window.scrollTo(0, 0)
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#f8a4b9]"></div></div>
  if (!post) return <div className="min-h-screen flex flex-col items-center justify-center bg-white">
    <h1 className="text-2xl font-bold mb-4">Post not found</h1>
    <Link to="/"><Button variant="outline">Back to Home</Button></Link>
  </div>

  return (
    <div className="min-h-screen bg-[#fcfafb]">
      <SEO 
        title={post.title}
        description={post.excerpt}
        ogImage={post.image_url}
        ogType="article"
      />

      {/* Hero Header */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors group">
               <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-white/20 transition-colors">
                 <ArrowLeft className="w-4 h-4" />
               </div>
              Back to Insights
            </Link>
            <div className="flex gap-3 mb-4">
               <span className="px-3 py-1 bg-[#f8a4b9] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">{post.category}</span>
            </div>
            <h1 className="text-2xl md:text-5xl font-bold text-white leading-tight mb-6">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-white/80 text-xs">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-[#f8a4b9]" /> {post.author}</div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#f8a4b9]" /> {new Date(post.published_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Main Content */}
        <article className="flex-1 bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-16 shadow-sm border border-[#f0e7ec]">
          {/* Top Ad Zone */}
          <AdSenseZone slot="blog_top" className="mb-8 md:mb-12" />

          <div 
            className="prose prose-sm md:prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-[#f8a4b9] prose-img:rounded-2xl md:prose-img:rounded-3xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Bottom Ad Zone */}
          <AdSenseZone slot="blog_bottom" className="mt-12" />

          <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-center">
            <div className="flex gap-4">
              <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => navigator.share({ title: post.title, url: window.location.href })}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Tag className="w-3 h-3" />
              {post.category}
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="w-full lg:w-96 space-y-8">
          {/* Sidebar Ad */}
          <AdSenseZone slot="blog_sidebar" format="rectangle" />

          <div className="bg-white rounded-3xl p-8 border border-[#f0e7ec] shadow-sm">
            <h3 className="font-bold text-lg mb-6">About GEB Surrogacy</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              We are a premier surrogacy and IVF coordination agency dedicated to helping families realize their dreams of parenthood through ethical, compassionate, and professional guidance.
            </p>
            <Link to="/#consultation">
              <Button className="w-full bg-[#f8a4b9] hover:bg-[#e88aa3] text-white py-6 rounded-2xl font-bold">
                Book Consultation
              </Button>
            </Link>
          </div>

          <div className="sticky top-24">
            <AdSenseZone slot="blog_sidebar_sticky" format="auto" />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default BlogPost;
