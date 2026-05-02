import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Facebook, Instagram, MessageCircle, Twitter, Send } from 'lucide-react'

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
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

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
            className="prose prose-sm md:prose-lg max-w-none 
              prose-headings:text-[#2d2d2d] prose-headings:font-serif prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
              prose-h2:text-3xl md:prose-h2:text-4xl prose-h2:border-l-4 prose-h2:border-[#f8a4b9] prose-h2:pl-6
              prose-h3:text-xl md:prose-h3:text-2xl
              prose-p:text-[#666666] prose-p:leading-relaxed prose-p:mb-6
              prose-strong:text-[#2d2d2d] prose-strong:font-bold
              prose-ul:my-8 prose-li:mb-2
              prose-a:text-[#f8a4b9] prose-a:font-bold hover:prose-a:text-[#e88aa3]
              prose-img:rounded-3xl prose-img:shadow-2xl prose-img:my-12"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Bottom Ad Zone */}
          <AdSenseZone slot="blog_bottom" className="mt-12" />

          <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-center">
            <div className="flex gap-4">
              <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Tag className="w-3 h-3" />
              {post.category}
            </div>
          </div>

          {/* Social Media Links */}
          <div className="mt-12 p-8 bg-[#fcfafb] rounded-3xl border border-[#f0e7ec] text-center">
            <h4 className="font-bold mb-4">Follow Our Journey</h4>
            <div className="flex justify-center gap-6">
              <a href="https://facebook.com/share/192smxW7GG/" target="_blank" className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1877f2] hover:scale-110 transition-all border border-gray-100"><Facebook className="w-6 h-6" /></a>
              <a href="https://instagram.com/geb_surrogacy_services" target="_blank" className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#e4405f] hover:scale-110 transition-all border border-gray-100"><Instagram className="w-6 h-6" /></a>
              <a href="https://wa.me/2347034270722" target="_blank" className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#25d366] hover:scale-110 transition-all border border-gray-100"><MessageCircle className="w-6 h-6" /></a>
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-16 pt-16 border-t border-gray-100">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-[#f8a4b9]" />
              Community Discussion ({post.comments?.length || 0})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="space-y-4 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  placeholder="Your Name" 
                  value={commentName} 
                  onChange={(e) => setCommentName(e.target.value)}
                  className="rounded-xl h-12 bg-gray-50 border-transparent focus:bg-white transition-all"
                  required
                />
              </div>
              <Textarea 
                placeholder="Share your thoughts or ask a question..." 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="rounded-2xl min-h-[120px] bg-gray-50 border-transparent focus:bg-white transition-all"
                required
              />
              <Button type="submit" disabled={submitting} className="bg-[#f8a4b9] hover:bg-[#e88aa3] text-white px-8 h-12 rounded-xl font-bold gap-2">
                {submitting ? 'Posting...' : 'Post Comment'} <Send className="w-4 h-4" />
              </Button>
            </form>

            {/* Comment List */}
            <div className="space-y-8">
              {post.comments?.map((comment: any) => (
                <div key={comment._id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#ffeef2] flex-shrink-0 flex items-center justify-center text-[#f8a4b9] font-bold">
                    {comment.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-sm text-gray-900">{comment.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl rounded-tl-none">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
              {(!post.comments || post.comments.length === 0) && (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-gray-400 italic">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
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
