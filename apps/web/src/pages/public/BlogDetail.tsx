import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { blogPosts } from './Blog';
import { Button } from '../../components/ui/Button';

export const BlogDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = blogPosts.find((p) => p.slug === slug) || blogPosts[0];

  return (
    <>
      <Helmet>
        <title>{post.title} | RV-Fitness Gym Blog</title>
        <meta name="description" content={post.summary} />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/blog')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Blog Articles
        </Button>

        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">FITNESS ARTICLE</span>
          <h1 className="text-4xl sm:text-5xl font-heading text-white tracking-wide uppercase mt-1">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-gym-muted mt-3 pb-6 border-b border-gym-border">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gym-primary" /> {post.date}</span>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-gym-primary" /> By {post.author}</span>
          </div>
        </div>

        <img src={post.image} alt={post.title} className="w-full h-80 sm:h-96 object-cover rounded-2xl border border-gym-border" />

        <div className="prose prose-invert max-w-none text-gym-text text-base leading-relaxed space-y-4 font-body">
          {post.content.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <div className="bg-gym-surface border border-gym-primary/40 rounded-xl p-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-heading text-white uppercase">Ready to put these tips into action?</h4>
            <p className="text-xs text-gym-muted">Book a 1-day free pass and train with our expert coaches!</p>
          </div>
          <Link to="/contact">
            <Button variant="primary">Claim Free Trial Pass</Button>
          </Link>
        </div>
      </div>
    </>
  );
};
