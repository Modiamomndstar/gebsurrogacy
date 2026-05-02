import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Heart,
  Baby,
  Users,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle,
  Menu,
  X,
  Facebook,
  Instagram,
  MessageCircle,
  Globe,
  Shield,
  Stethoscope,
  FileText,
  Clock
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import SEO from '@/components/SEO'
import AdSenseZone from '@/components/AdSenseZone'
import '../App.css'

gsap.registerPlugin(ScrollTrigger)

// Company Information
const COMPANY_INFO = {
  name: 'GEB Surrogacy Services',
  founded: 2017,
  founder: 'Blessing Gbudje',
  phone: '+2347034270722',
  whatsapp: '+2347034270722',
  email: 'gebheritagagency@gmail.com',
  nigeriaAddress: 'Block D5 Flat 36 CBN Estate 2, Satellite Town Lagos Nigeria',
  ukAddress: 'Leeds, UK',
  ukPhone: '+447933193271',
  usaAddress: 'California, USA',
  usaPhone: '+13102188513',
  facebook: 'https://www.facebook.com/share/192smxW7GG/',
  instagram: 'https://www.instagram.com/geb_surrogacy_services',
  domain: 'gebsurrogacyservices.com'
}

// Services data
const SERVICES = [
  {
    icon: Baby,
    title: 'Gestational Surrogacy',
    description: 'Full surrogacy program including surrogate matching, medical coordination, and comprehensive support throughout the journey.',
    features: ['Personalized matching', 'Medical screening', 'Legal support', 'Emotional counseling']
  },
  {
    icon: Stethoscope,
    title: 'IVF Coordination',
    description: 'Expert fertility treatment management with partner clinics, ensuring the highest standards of care.',
    features: ['Partner clinic network', 'Treatment monitoring', 'Travel coordination', 'Success tracking']
  },
  {
    icon: Users,
    title: 'Egg Donation',
    description: 'Access to our premium donor database with comprehensive screening and matching services.',
    features: ['Verified donors', 'Medical history', 'Genetic screening', 'Anonymous options']
  },
  {
    icon: FileText,
    title: 'Legal Support',
    description: 'Comprehensive contract and parental rights assistance to protect all parties involved.',
    features: ['Contract drafting', 'Parental orders', 'International law', 'Documentation']
  }
]

// Process steps
const PROCESS_STEPS = [
  { number: '01', title: 'Initial Consultation', description: 'Free consultation to discuss your needs and answer all your questions.' },
  { number: '02', title: 'Matching Process', description: 'We carefully match you with a surrogate based on compatibility and preferences.' },
  { number: '03', title: 'Medical Screening', description: 'Comprehensive medical and psychological screening for all parties.' },
  { number: '04', title: 'Legal Agreements', description: 'Drafting and signing of comprehensive legal contracts.' },
  { number: '05', title: 'Embryo Transfer', description: 'Coordination of IVF and embryo transfer procedure.' },
  { number: '06', title: 'Pregnancy & Birth', description: 'Ongoing support throughout pregnancy until delivery.' }
]

// Testimonials
const TESTIMONIALS = [
  {
    quote: "GEB Surrogacy made our dream of parenthood a reality. Their support was unwavering throughout the entire journey. We are forever grateful.",
    author: "The Johnson Family",
    location: "London, UK"
  },
  {
    quote: "Professional, caring, and dedicated. Blessing and her team walked with us every step of the way. We couldn't have asked for better support.",
    author: "The Smiths",
    location: "Lagos, Nigeria"
  },
  {
    quote: "After 10 years of trying, GEB Surrogacy helped us finally become parents. Their compassion and expertise are unmatched.",
    author: "The Williams",
    location: "Texas, USA"
  }
]

// Stats
const STATS = [
  { value: '500+', label: 'Families Created' },
  { value: '98%', label: 'Success Rate' },
  { value: '10+', label: 'Years Experience' },
  { value: '3', label: 'Countries Served' }
]

function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConsultDialogOpen, setIsConsultDialogOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [siteSettings, setSiteSettings] = useState<any>({})
  const [activeService, setActiveService] = useState<number>(0)
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [testimonials, setTestimonials] = useState<any[]>([])

  // Fetch dynamic content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const [blogRes, servicesRes, testimoniesRes, settingsRes] = await Promise.all([
          fetch('/api/blog-posts?limit=3'),
          fetch('/api/services'),
          fetch('/api/testimonies'),
          fetch('/api/settings')
        ]);

        if (blogRes.ok) {
          const data = await blogRes.json();
          setBlogPosts(data.posts || []);
        }
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(data.services || []);
          if (data.services?.length > 0) setActiveService(0);
        }
        if (testimoniesRes.ok) {
          const data = await testimoniesRes.json();
          setTestimonials(data.testimonies || []);
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSiteSettings(data.settings || {});
        }
      } catch (err) {
        console.error('Fetch error:', err);
      }
    };
    fetchContent();

    // Track visit
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageUrl: window.location.pathname, referrer: document.referrer })
    }).catch(() => console.error('Visit tracking failed'));
  }, [])

  const heroRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const processRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const blogRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // GSAP animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.from('.hero-title', {
        y: 100,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.2
      })

      gsap.from('.hero-subtitle', {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.5
      })

      gsap.from('.hero-cta', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.8
      })

      gsap.from('.hero-stat', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 1
      })

      // Scroll-triggered animations
      gsap.utils.toArray<HTMLElement>('.scroll-reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out'
        })
      })

      // Process steps animation
      gsap.utils.toArray<HTMLElement>('.process-step').forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          },
          x: i % 2 === 0 ? -50 : 50,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out'
        })
      })
    })

    return () => ctx.revert()
  }, [])

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const handleConsultSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      location: formData.get('location'),
      preferred_date: formData.get('preferred_date'),
      message: formData.get('message')
    }

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        toast.success('Consultation request submitted! We will contact you soon.')
        setIsConsultDialogOpen(false)
      } else {
        toast.error('Failed to submit request. Please try again.')
      }
    } catch (err) {
      toast.error('Network error. Please try again.')
    }
  }

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      email: formData.get('email')
    }

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        toast.success('Thank you for subscribing to our newsletter!')
        e.currentTarget.reset()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Subscription failed')
      }
    } catch (error) {
      toast.error('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Global Surrogacy & IVF Services | Nigeria, UK, USA"
        description="GEB Surrogacy Services provides compassionate, professional gestational surrogacy and IVF coordination in Nigeria, UK, and USA. Start your journey to parenthood today."
        keywords="surrogacy nigeria, ivf nigeria, surrogacy uk, surrogacy usa, international surrogacy agency, infertility treatment, egg donation, parenthood journey"
      />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": siteSettings.company_name || "GEB Surrogacy Services",
          "url": "https://gebsurrogacyservices.com",
          "logo": "https://gebsurrogacyservices.com/logo.png",
          "contactPoint": [
            {
              "@type": "ContactPoint",
              "telephone": siteSettings.contact_phone || "+2347034270722",
              "contactType": "customer service",
              "areaServed": "NG",
              "availableLanguage": "en"
            },
            {
              "@type": "ContactPoint",
              "telephone": siteSettings.uk_phone || "+447933193271",
              "contactType": "UK Support",
              "areaServed": "GB",
              "availableLanguage": "en"
            },
            {
              "@type": "ContactPoint",
              "telephone": siteSettings.usa_phone || "+13102188513",
              "contactType": "USA Support",
              "areaServed": "US",
              "availableLanguage": "en"
            }
          ],
          "sameAs": [
            "https://www.facebook.com/share/192smxW7GG/",
            "https://www.instagram.com/geb_surrogacy_services"
          ]
        })}
      </script>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'glass shadow-lg py-3' : 'bg-transparent py-5'
      }`}>
        <div className="section-padding">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f8a4b9] flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className={`font-serif text-xl font-semibold transition-colors ${
                isScrolled ? 'text-[#2d2d2d]' : 'text-[#2d2d2d]'
              }`}>
                GEB Surrogacy
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {[
                { label: 'Home', ref: heroRef, type: 'scroll' },
                { label: 'About', ref: aboutRef, type: 'scroll' },
                { label: 'Services', ref: servicesRef, type: 'scroll' },
                { label: 'Process', ref: processRef, type: 'scroll' },
                { label: 'Blog', path: '/blog', type: 'link' },
                { label: 'Become a Surrogate', path: '/become-a-surrogate', type: 'link' },
                { label: 'Contact', ref: ctaRef, type: 'scroll' }
              ].map((item) => (
                item.type === 'scroll' ? (
                  <button
                    key={item.label}
                    onClick={() => scrollToSection(item.ref!)}
                    className={`text-sm font-medium transition-colors hover:text-[#f8a4b9] ${
                      isScrolled ? 'text-[#2d2d2d]' : 'text-[#2d2d2d]'
                    }`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path!}
                    className={`text-sm font-medium transition-colors hover:text-[#f8a4b9] ${
                      isScrolled ? 'text-[#2d2d2d]' : 'text-[#2d2d2d]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden lg:block">
              <button
                onClick={() => setIsConsultDialogOpen(true)}
                className="btn-primary text-sm"
              >
                Book Consultation
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-[#2d2d2d]" />
              ) : (
                <Menu className="w-6 h-6 text-[#2d2d2d]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden glass border-t border-gray-100">
            <div className="section-padding py-4 flex flex-col gap-4">
              {[
                { label: 'Home', ref: heroRef, type: 'scroll' },
                { label: 'About', ref: aboutRef, type: 'scroll' },
                { label: 'Services', ref: servicesRef, type: 'scroll' },
                { label: 'Process', ref: processRef, type: 'scroll' },
                { label: 'Blog', path: '/blog', type: 'link' },
                { label: 'Become a Surrogate', path: '/become-a-surrogate', type: 'link' },
                { label: 'Contact', ref: ctaRef, type: 'scroll' }
              ].map((item) => (
                item.type === 'scroll' ? (
                  <button
                    key={item.label}
                    onClick={() => scrollToSection(item.ref!)}
                    className="text-left text-[#2d2d2d] font-medium py-2 hover:text-[#f8a4b9] transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path!}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-left text-[#2d2d2d] font-medium py-2 hover:text-[#f8a4b9] transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              ))}
              <button
                onClick={() => {
                  setIsConsultDialogOpen(true)
                  setIsMenuOpen(false)
                }}
                className="btn-primary text-sm mt-2"
              >
                Book Consultation
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#ffeef2] rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#f8a4b9] rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ffeef2] rounded-full blur-3xl opacity-50" />
        </div>

        <div className="section-padding relative z-10 w-full">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                  <Heart className="w-4 h-4 text-[#f8a4b9]" />
                  <span className="text-sm font-medium text-[#e88aa3]">Creating Families Since 2017</span>
                </div>

                <h1 className="hero-title text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-[#2d2d2d] leading-tight mb-6">
                  Creating Families,{' '}
                  <span className="text-[#f8a4b9]">Fulfilling Dreams</span>
                </h1>

                <p className="hero-subtitle text-lg sm:text-xl text-[#666666] mb-8 max-w-xl">
                  Compassionate surrogacy services guiding you through every step of your journey to parenthood. Serving families in Nigeria, UK, and USA.
                </p>

                <div className="hero-cta flex flex-wrap gap-4 mb-12">
                  <button
                    onClick={() => setIsConsultDialogOpen(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    Begin Your Journey
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <Link
                    to="/become-a-surrogate"
                    className="btn-secondary flex items-center gap-2"
                  >
                    Become a Surrogate
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {STATS.map((stat, index) => (
                    <div key={index} className="hero-stat">
                      <div className="text-2xl sm:text-3xl font-serif font-bold text-[#f8a4b9]">{stat.value}</div>
                      <div className="text-sm text-[#666666]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Image */}
              <div className="order-1 lg:order-2 relative">
                <div className="relative">
                  <div className="absolute -inset-4 bg-[#f8a4b9] rounded-[3rem] opacity-20 blur-2xl" />
                  <img
                    src="/images/logo1.jpeg"
                    alt="GEB Surrogacy Services"
                    className="relative w-full max-w-lg mx-auto rounded-3xl shadow-2xl animate-pulse-soft"
                  />
                </div>

                {/* Floating Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#ffeef2] rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-[#f8a4b9]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#2d2d2d]">Trusted Agency</div>
                      <div className="text-sm text-[#666666]">Since 2017</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutRef} className="py-20 lg:py-32 bg-[#f8f8f8]">
        <div className="section-padding">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Image */}
              <div className="scroll-reveal relative">
                <div className="relative">
                  <div className="absolute -inset-4 bg-[#f8a4b9] rounded-[2rem] opacity-10" />
                  <img
                    src="/images/image.png"
                    alt="Blessing Gbudje - Founder & CEO"
                    className="relative w-full rounded-2xl shadow-xl"
                  />
                </div>

                {/* Experience Badge */}
                <div className="absolute -bottom-8 -right-8 bg-[#f8a4b9] text-white rounded-2xl p-6 shadow-xl">
                  <div className="text-4xl font-serif font-bold">10+</div>
                  <div className="text-sm opacity-90">Years of<br />Experience</div>
                </div>
              </div>

              {/* Content */}
              <div className="scroll-reveal">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                  <Users className="w-4 h-4 text-[#f8a4b9]" />
                  <span className="text-sm font-medium text-[#e88aa3]">About Us</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#2d2d2d] mb-6">
                  A Legacy of Love & Expertise
                </h2>

                <p className="text-lg text-[#666666] mb-6">
                  Founded by <strong className="text-[#2d2d2d]">Blessing Gbudje</strong> in 2017, GEB Surrogacy Services has been at the forefront of fertility assistance, serving families across Nigeria, the United Kingdom, and the United States. Our journey began with a simple mission: to help create families through compassionate care and professional excellence.
                </p>

                <p className="text-[#666666] mb-8">
                  Blessing's personal experience as an altruistic surrogate in 2015 inspired her to establish an agency that truly understands the emotional and physical journey of all parties involved. "Surrogacy is like a calling for me," she says. "I'm passionate about making life liveable for everyone, especially women."
                </p>

                {/* Features */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {[
                    'Personalized matching process',
                    'Comprehensive medical screening',
                    'Legal and emotional support',
                    'International client services'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#f8a4b9] flex-shrink-0" />
                      <span className="text-[#2d2d2d]">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => scrollToSection(servicesRef)}
                  className="btn-primary"
                >
                  Explore Our Services
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section ref={servicesRef} className="py-20 lg:py-32">
        <div className="section-padding">
          <div className="container-custom">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 scroll-reveal">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                <Heart className="w-4 h-4 text-[#f8a4b9]" />
                <span className="text-sm font-medium text-[#e88aa3]">Our Services</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#2d2d2d] mb-4">
                Comprehensive Surrogacy Solutions
              </h2>
              <p className="text-lg text-[#666666]">
                Tailored to your unique journey, our services cover every aspect of the surrogacy process.
              </p>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {(Array.isArray(services) && services.length > 0 ? services : SERVICES).map((service, index) => {
                const iconMap: any = { Baby, Stethoscope, Users, FileText, Heart, Shield, Globe };
                const Icon = typeof service.icon === 'string' ? (iconMap[service.icon] || Heart) : service.icon;
                const features = typeof service.features === 'string' ? JSON.parse(service.features) : service.features;

                return (
                  <div
                    key={index}
                    className={`scroll-reveal group relative bg-white rounded-3xl p-8 border-2 transition-all duration-500 cursor-pointer ${
                      activeService === index
                        ? 'border-[#f8a4b9] shadow-xl'
                        : 'border-gray-100 hover:border-[#f8a4b9]/50 hover:shadow-lg'
                    }`}
                    onClick={() => setActiveService(index)}
                  >
                    <div className="flex items-start gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                        activeService === index ? 'bg-[#f8a4b9]' : 'bg-[#ffeef2] group-hover:bg-[#f8a4b9]/20'
                      }`}>
                        <Icon className={`w-8 h-8 transition-colors ${
                          activeService === index ? 'text-white' : 'text-[#f8a4b9]'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-serif font-semibold text-[#2d2d2d] mb-2">{service.title}</h3>
                        <p className="text-[#666666] mb-4">{service.description}</p>

                        <div className={`grid grid-cols-2 gap-2 transition-all duration-500 overflow-hidden ${
                          activeService === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                        }`}>
                          {(Array.isArray(features) ? features : []).map((feature: string, fIndex: number) => (
                            <div key={fIndex} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-[#f8a4b9]" />
                              <span className="text-sm text-[#666666]">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section ref={processRef} className="py-20 lg:py-32 bg-[#f8f8f8]">
        <div className="section-padding">
          <div className="container-custom">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 scroll-reveal">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                <Clock className="w-4 h-4 text-[#f8a4b9]" />
                <span className="text-sm font-medium text-[#e88aa3]">Our Process</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#2d2d2d] mb-4">
                Your Journey, Our Guidance
              </h2>
              <p className="text-lg text-[#666666]">
                A clear path from consultation to parenthood, with support at every step.
              </p>
            </div>

            {/* Process Steps */}
            <div className="relative">
              {/* Connection Line */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-[#f8a4b9]/30" />

              <div className="space-y-12 lg:space-y-0">
                {(PROCESS_STEPS || []).map((step, index) => (
                  <div
                    key={index}
                    className={`process-step lg:grid lg:grid-cols-2 lg:gap-12 items-center ${
                      index !== 0 ? 'lg:mt-12' : ''
                    }`}
                  >
                    {/* Content */}
                    <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                      <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-[#f8a4b9] text-white rounded-full flex items-center justify-center font-serif font-bold text-lg">
                            {step.number}
                          </div>
                          <h3 className="text-xl font-serif font-semibold text-[#2d2d2d]">{step.title}</h3>
                        </div>
                        <p className="text-[#666666]">{step.description}</p>
                      </div>
                    </div>

                    {/* Center Node */}
                    <div className="hidden lg:flex justify-center">
                      <div className="w-4 h-4 bg-[#f8a4b9] rounded-full border-4 border-white shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className="py-20 lg:py-32">
        <div className="section-padding">
          <div className="container-custom">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 scroll-reveal">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                <Heart className="w-4 h-4 text-[#f8a4b9]" />
                <span className="text-sm font-medium text-[#e88aa3]">Testimonials</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#2d2d2d] mb-4">
                Stories of Joy
              </h2>
              <p className="text-lg text-[#666666]">
                Hear from families whose dreams we've helped fulfill.
              </p>
            </div>

            {/* Testimonials Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {(Array.isArray(testimonials) && testimonials.length > 0 ? testimonials : TESTIMONIALS).map((testimonial, index) => (
                <div
                  key={index}
                  className="scroll-reveal bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="text-6xl text-[#f8a4b9] font-serif mb-4">"</div>
                  <p className="text-[#666666] mb-6 italic">{testimonial.quote}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#ffeef2] rounded-full flex items-center justify-center overflow-hidden border-2 border-[#ffeef2]">
                      {testimonial.image_url ? (
                        <img src={testimonial.image_url} alt={testimonial.author || testimonial.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-[#f8a4b9]" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-[#2d2d2d]">{testimonial.author || testimonial.name}</div>
                      <div className="text-sm text-[#666666]">{testimonial.location}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section ref={blogRef} className="py-20 lg:py-32 bg-[#f8f8f8]">
        <div className="section-padding">
          <div className="container-custom">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12 scroll-reveal">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffeef2] rounded-full mb-6">
                  <Globe className="w-4 h-4 text-[#f8a4b9]" />
                  <span className="text-sm font-medium text-[#e88aa3]">Our Blog</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#2d2d2d]">
                  Insights & Stories
                </h2>
              </div>
              <Link to="/blog" className="btn-secondary flex items-center gap-2">
                View All Posts
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Blog Grid */}
            <AdSenseZone slot="home_blog_top" className="mb-12" />

            {/* Blog Grid Slider */}
            <div className="relative overflow-hidden group pb-8">
              <div 
                className="flex gap-8 transition-transform duration-1000 ease-in-out"
                style={{ 
                  animation: (Array.isArray(blogPosts) && blogPosts.length > 3) ? `scroll-${blogPosts.length} 40s linear infinite` : 'none',
                  width: (Array.isArray(blogPosts) && blogPosts.length > 3) ? `${blogPosts.length * 400 * 2}px` : '100%',
                  display: (Array.isArray(blogPosts) && blogPosts.length > 3) ? 'flex' : 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
                }}
              >
                {[...(Array.isArray(blogPosts) ? blogPosts : []), ...(Array.isArray(blogPosts) && blogPosts.length > 3 ? blogPosts : [])].map((post, index) => (
                  <article 
                    key={index}
                    className="flex-shrink-0 w-[300px] sm:w-[380px] scroll-reveal bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    <Link to={`/blog/${post.id || post._id}`}>
                      <div className="h-56 overflow-hidden relative">
                        <img 
                          src={post.image_url || 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800'} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-4 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-[#f8a4b9] shadow-sm">
                            {post.category}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-sm text-[#666666] flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(post.published_at || post.created_at || Date.now()).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-[#666666] flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          5 min read
                        </span>
                      </div>
                      <h3 className="text-xl font-serif font-semibold text-[#2d2d2d] mb-3 group-hover:text-[#f8a4b9] transition-colors line-clamp-2">
                        <Link to={`/blog/${post.id || post._id}`}>{post.title}</Link>
                      </h3>
                      <p className="text-[#666666] mb-6 line-clamp-2 text-sm leading-relaxed">{post.excerpt}</p>
                      <Link 
                        to={`/blog/${post.id || post._id}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#f8a4b9] hover:gap-3 transition-all"
                      >
                        Read Full Story
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              
              <style>{`
                @keyframes scroll-${blogPosts?.length || 0} {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(calc(-380px * ${blogPosts?.length || 0} - 32px * ${blogPosts?.length || 0})); }
                }
                .group:hover div {
                  animation-play-state: paused !important;
                }
              `}</style>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 lg:py-32 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8a4b9] to-[#e88aa3]" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="section-padding relative z-10">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto text-center scroll-reveal">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-6">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-white/90 mb-8">
                Book a free consultation with our fertility experts today. Let's discuss how we can help make your dream of parenthood a reality.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setIsConsultDialogOpen(true)}
                  className="px-8 py-4 bg-white text-[#f8a4b9] font-semibold rounded-full hover:bg-[#ffeef2] transition-all duration-300 hover:-translate-y-1 shadow-lg"
                >
                  Schedule Free Consultation
                </button>
                <a
                  href={`https://wa.me/${COMPANY_INFO.whatsapp.replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-transparent text-white font-semibold rounded-full border-2 border-white hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2d2d2d] text-white py-16">
        <div className="section-padding">
          <div className="container-custom">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              {/* Company Info */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#f8a4b9] flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-serif text-xl font-semibold">GEB Surrogacy</span>
                </div>
                <p className="text-gray-400 mb-6">
                  Creating families and fulfilling dreams through compassionate surrogacy services since 2017.
                </p>
                <div className="flex gap-4">
                  <a
                    href={COMPANY_INFO.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#f8a4b9] transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a
                    href={COMPANY_INFO.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#f8a4b9] transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href={`https://wa.me/${(siteSettings.whatsapp_number || COMPANY_INFO.whatsapp).replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#f8a4b9] transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-serif text-lg font-semibold mb-6">Quick Links</h4>
                <ul className="space-y-3">
                  {[
                    { label: 'Home', ref: heroRef },
                    { label: 'About Us', ref: aboutRef },
                    { label: 'Our Services', ref: servicesRef },
                    { label: 'The Process', ref: processRef },
                    { label: 'Blog', ref: blogRef }
                  ].map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={() => scrollToSection(link.ref)}
                        className="text-gray-400 hover:text-[#f8a4b9] transition-colors"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Services */}
              <div>
                <h4 className="font-serif text-lg font-semibold mb-6">Our Services</h4>
                <ul className="space-y-3">
                  {SERVICES.map((service) => (
                    <li key={service.title}>
                      <span className="text-gray-400">{service.title}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-serif text-lg font-semibold mb-6">Contact Us</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#f8a4b9] flex-shrink-0 mt-0.5" />
                    <div className="text-gray-400 text-sm">
                      <div className="mb-3">
                        <p className="font-bold text-white mb-1">Nigeria Office</p>
                        <p>{siteSettings.address_nigeria || COMPANY_INFO.nigeriaAddress}</p>
                        <p className="text-xs mt-1 text-[#f8a4b9]">{siteSettings.contact_phone || COMPANY_INFO.phone}</p>
                      </div>
                      <div className="mb-3">
                        <p className="font-bold text-white mb-1">UK Presence</p>
                        <p>{siteSettings.address_uk || COMPANY_INFO.ukAddress}</p>
                        <p className="text-xs mt-1 text-[#f8a4b9]">{siteSettings.uk_phone || COMPANY_INFO.ukPhone}</p>
                      </div>
                      <div>
                        <p className="font-bold text-white mb-1">USA Presence</p>
                        <p>{siteSettings.address_usa || COMPANY_INFO.usaAddress}</p>
                        <p className="text-xs mt-1 text-[#f8a4b9]">{siteSettings.usa_phone || COMPANY_INFO.usaPhone}</p>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#f8a4b9] flex-shrink-0" />
                    <a href={`mailto:${siteSettings.contact_email || COMPANY_INFO.email}`} className="text-gray-400 hover:text-[#f8a4b9] transition-colors text-sm">
                      {siteSettings.contact_email || COMPANY_INFO.email}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Newsletter */}
            <div className="border-t border-white/10 pt-8 mb-8">
              <div className="max-w-xl mx-auto text-center">
                <h4 className="font-serif text-lg font-semibold mb-2">Subscribe to Our Newsletter</h4>
                <p className="text-gray-400 mb-4">Get the latest updates on surrogacy news and stories.</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                  <Input
                    name="name"
                    placeholder="Your Name"
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-xl h-12"
                    required
                  />
                  <Input
                    name="email"
                    type="email"
                    placeholder="Your Email"
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-xl h-12"
                    required
                  />
                  <Button type="submit" className="bg-[#f8a4b9] hover:bg-[#e88aa3] text-white px-8 rounded-xl h-12 font-bold transition-all active:scale-95">
                    Subscribe
                  </Button>
                </form>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm">
              <p>&copy; {new Date().getFullYear()} GEB Surrogacy Services. All rights reserved.</p>
              <div className="mt-4 flex justify-center gap-6">
                <Link to="/become-a-surrogate" className="hover:text-[#f8a4b9] transition-colors">Become a Surrogate</Link>
                <Link to="/privacy" className="hover:text-[#f8a4b9] transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-[#f8a4b9] transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Consultation Dialog */}
      <Dialog open={isConsultDialogOpen} onOpenChange={setIsConsultDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Book a Consultation</DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll get back to you within 24 hours.
              {siteSettings.consultation_fee && (
                <span className="block mt-2 font-medium text-[#f8a4b9]">Consultation Fee: {siteSettings.consultation_fee}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConsultSubmit} className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name</label>
                <Input name="first_name" placeholder="John" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name</label>
                <Input name="last_name" placeholder="Doe" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input name="email" type="email" placeholder="john@example.com" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input name="phone" type="tel" placeholder="+234..." required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Input name="location" placeholder="City, Country" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Preferred Date</label>
              <Input name="preferred_date" type="date" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message</label>
              <Textarea name="message" placeholder="Tell us about your journey and what you're looking for..." rows={4} />
            </div>
            <Button type="submit" className="w-full bg-[#f8a4b9] hover:bg-[#e88aa3] text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Consultation
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Home
