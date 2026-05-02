import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Twitter, 
  Send, 
  Share2, 
  ArrowLeft, 
  User, 
  Calendar, 
  Tag,
  Clock,
  ChevronRight
} from 'lucide-react'
import SEO from '@/components/SEO'
import AdSenseZone from '@/components/AdSenseZone'

const BlogPost = () => {
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [commentName, setCommentName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentName || !commentText) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/blog-posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: commentName, content: commentText })
      })
      if (res.ok) {
        toast.success('Comment posted successfully!')
        setCommentText('')
        // Reload comments
        const freshPost = await fetch(`/api/blog-posts/${id}`)
        if (freshPost.ok) setPost(await freshPost.json())
      }
    } catch (err) {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#f8a4b9]"></div>
    </div>
  )
  
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-2xl font-bold mb-4 font-serif">Post not found</h1>
      <Link to="/"><Button variant="outline" className="rounded-full">Back to Home</Button></Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fdfafb]">
      <SEO 
        title={post.title}
        description={post.excerpt}
        ogImage={post.image_url}
        ogType="article"
      />

      {/* Modern Hero Header */}
      <div className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
        <img src={post.image_url} alt={post.title} className="w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-20">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-all group bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
               <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
               <span className="text-xs font-bold uppercase tracking-widest">Back to Insights</span>
            </Link>
            
            <div className="flex gap-3 mb-6">
               <span className="px-4 py-1.5 bg-[#f8a4b9] text-white text-[10px] font-bold rounded-full uppercase tracking-[0.2em] shadow-lg shadow-[#f8a4b9]/20">{post.category}</span>
            </div>
            
            <h1 className="text-3xl md:text-6xl font-serif font-bold text-white leading-[1.1] mb-8 drop-shadow-sm">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-8 text-white/80 text-xs font-medium tracking-wide">
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <User className="w-4 h-4 text-[#f8a4b9]" /> 
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <Calendar className="w-4 h-4 text-[#f8a4b9]" /> 
                <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <Clock className="w-4 h-4 text-[#f8a4b9]" /> 
                <span>5 min read</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 md:py-24 flex flex-col lg:flex-row gap-12 lg:gap-16">
        {/* Main Content Area */}
        <div className="flex-1 space-y-12">
          <article className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-20 shadow-xl shadow-gray-200/50 border border-[#f0e7ec] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#f8a4b9]/10" />
            
            {/* Top Ad Zone */}
            <AdSenseZone slot="blog_top" className="mb-12 rounded-2xl overflow-hidden border border-gray-100" />

            <div 
              className="prose prose-sm md:prose-lg max-w-none 
                prose-headings:text-[#2d2d2d] prose-headings:font-serif prose-headings:font-bold prose-headings:mt-16 prose-headings:mb-8
                prose-h2:text-4xl md:prose-h2:text-5xl prose-h2:leading-tight
                prose-h3:text-2xl md:prose-h3:text-3xl
                prose-p:text-[#4a4a4a] prose-p:leading-[1.8] prose-p:mb-8 prose-p:text-lg
                prose-strong:text-[#2d2d2d] prose-strong:font-bold
                prose-ul:my-10 prose-li:mb-4 prose-li:text-lg
                prose-a:text-[#f8a4b9] prose-a:font-bold prose-a:no-underline hover:prose-a:text-[#e88aa3] prose-a:border-b-2 prose-a:border-[#f8a4b9]/30 hover:prose-a:border-[#f8a4b9] prose-a:transition-all
                prose-blockquote:border-l-4 prose-blockquote:border-[#f8a4b9] prose-blockquote:bg-[#fcfafb] prose-blockquote:p-8 prose-blockquote:rounded-r-3xl prose-blockquote:italic prose-blockquote:text-xl prose-blockquote:text-gray-700
                prose-img:rounded-[2rem] prose-img:shadow-2xl prose-img:my-16"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Bottom Ad Zone */}
            <AdSenseZone slot="blog_bottom" className="mt-16 rounded-2xl overflow-hidden border border-gray-100" />

            {/* Interaction Bar */}
            <div className="mt-20 pt-10 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="rounded-full gap-3 px-8 border-gray-200 hover:bg-[#f8a4b9] hover:text-white hover:border-[#f8a4b9] transition-all group" 
                  onClick={handleShare}
                >
                  <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                  <span className="font-bold">Share Story</span>
                </Button>
                
                <div className="flex gap-3">
                  {[
                    { icon: Facebook, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, color: 'hover:bg-blue-50 hover:text-blue-600' },
                    { icon: Twitter, url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, color: 'hover:bg-sky-50 hover:text-sky-500' },
                    { icon: MessageCircle, url: `https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`, color: 'hover:bg-green-50 hover:text-green-500' }
                  ].map((social, i) => (
                    <a 
                      key={i} 
                      href={social.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 transition-all ${social.color}`}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-full border border-gray-100">
                <Tag className="w-4 h-4 text-[#f8a4b9]" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{post.category}</span>
              </div>
            </div>

            {/* Creator Card */}
            <div className="mt-16 p-10 bg-gradient-to-br from-[#fcfafb] to-white rounded-[2.5rem] border border-[#f0e7ec] flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-2xl bg-[#f8a4b9] flex items-center justify-center text-white text-3xl font-serif font-bold shadow-lg shadow-[#f8a4b9]/20">
                GEB
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-serif font-bold text-xl mb-2 text-[#2d2d2d]">GEB Surrogacy Editorial Team</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Dedicated to providing accurate, compassionate, and inspiring content for the surrogacy community worldwide.
                </p>
              </div>
              <div className="flex gap-4">
                <a href="https://instagram.com/geb_surrogacy_services" target="_blank" className="text-gray-400 hover:text-[#e4405f] transition-colors"><Instagram className="w-6 h-6" /></a>
                <a href="https://facebook.com/share/192smxW7GG/" target="_blank" className="text-gray-400 hover:text-[#1877f2] transition-colors"><Facebook className="w-6 h-6" /></a>
              </div>
            </div>
          </article>

          {/* High-Impact Comments Section */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-20 shadow-xl shadow-gray-200/50 border border-[#f0e7ec]">
            <h3 className="text-3xl font-serif font-bold mb-12 flex items-center gap-4 text-[#2d2d2d]">
              <MessageCircle className="w-8 h-8 text-[#f8a4b9]" />
              Community Voices ({post.comments?.length || 0})
            </h3>

            {/* Enhanced Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-6 mb-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Your Name</label>
                  <Input 
                    placeholder="Enter your name" 
                    value={commentName} 
                    onChange={(e) => setCommentName(e.target.value)}
                    className="rounded-2xl h-14 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#f8a4b9]/20 transition-all text-lg"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">Share your thoughts</label>
                <Textarea 
                  placeholder="Join the discussion..." 
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="rounded-[2rem] min-h-[180px] bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-[#f8a4b9]/20 transition-all text-lg p-6"
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="bg-[#f8a4b9] hover:bg-[#e88aa3] text-white px-10 h-14 rounded-2xl font-bold text-lg gap-3 shadow-lg shadow-[#f8a4b9]/20 transition-all hover:scale-[1.02]">
                {submitting ? 'Sending...' : 'Post Comment'} <Send className="w-5 h-5" />
              </Button>
            </form>

            {/* Sophisticated Comment List */}
            <div className="space-y-10">
              {post.comments?.map((comment: any) => (
                <div key={comment._id} className="flex gap-6 group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ffeef2] to-[#fff5f7] flex-shrink-0 flex items-center justify-center text-[#f8a4b9] text-xl font-bold border border-[#f8a4b9]/10 shadow-sm group-hover:scale-110 transition-transform">
                    {comment.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="font-bold text-lg text-gray-900">{comment.name}</span>
                      <div className="w-1 h-1 rounded-full bg-gray-200" />
                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-[#f8a4b9]/20 to-transparent rounded-full" />
                      <p className="text-gray-600 leading-relaxed text-lg pl-3">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {(!post.comments || post.comments.length === 0) && (
                <div className="text-center py-20 bg-[#fcfafb] rounded-[3rem] border-2 border-dashed border-[#f0e7ec]">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <MessageCircle className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400 italic font-serif text-xl">Be the first to share your journey with us.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium Sidebar */}
        <aside className="w-full lg:w-[400px] space-y-12">
          {/* Sidebar Ad */}
          <AdSenseZone slot="blog_sidebar" format="rectangle" className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm" />

          {/* CTA Card */}
          <div className="bg-[#2d2d2d] rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#f8a4b9]/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            
            <h3 className="font-serif font-bold text-3xl mb-6 relative z-10">Start Your Miracle Today</h3>
            <p className="text-gray-400 leading-relaxed mb-10 text-lg relative z-10">
              We guide you through every step of your parenthood journey with expertise and compassion.
            </p>
            <Link to="/#consultation">
              <Button className="w-full bg-[#f8a4b9] hover:bg-white hover:text-[#f8a4b9] text-white py-8 rounded-[1.5rem] font-bold text-lg transition-all group shadow-xl shadow-[#f8a4b9]/20 relative z-10">
                Book Free Consultation <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Social Proof Sidebar */}
          <div className="bg-white rounded-[3rem] p-10 border border-[#f0e7ec] shadow-sm">
            <h4 className="font-serif font-bold text-xl mb-8">Connect With Us</h4>
            <div className="grid grid-cols-2 gap-4">
              <a href="https://facebook.com/share/192smxW7GG/" target="_blank" className="flex flex-col items-center justify-center p-6 bg-[#fcfafb] rounded-3xl border border-transparent hover:border-[#1877f2]/20 hover:bg-blue-50 transition-all group">
                <Facebook className="w-8 h-8 text-[#1877f2] mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Facebook</span>
              </a>
              <a href="https://instagram.com/geb_surrogacy_services" target="_blank" className="flex flex-col items-center justify-center p-6 bg-[#fcfafb] rounded-3xl border border-transparent hover:border-[#e4405f]/20 hover:bg-pink-50 transition-all group">
                <Instagram className="w-6 h-6 text-[#e4405f] mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Instagram</span>
              </a>
            </div>
          </div>

          <div className="sticky top-24">
            <AdSenseZone slot="blog_sidebar_sticky" format="auto" className="rounded-3xl overflow-hidden" />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default BlogPost;
