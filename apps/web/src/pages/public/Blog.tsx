import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, ArrowRight, User } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { useContent } from '../../content/ContentContext';


export const Blog: React.FC = () => {
  const blogPosts = useContent('blog').posts;
  return (
    <>
      <Helmet>
        <title>Fitness & Diet Blog | RV Fitness</title>
        <meta name="description" content="Read expert workout plans, Indian diet advice, muscle building tips, and fat loss strategies on the RV Fitness blog." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">EXPERT KNOWLEDGE</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            FITNESS & DIET <span className="text-gym-primary">BLOG</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Actionable fitness insights, Indian diet prep guides, and exercise science articles written by our certified coaches.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogPosts.map((post) => (
            <Card key={post.slug} className="flex flex-col justify-between overflow-hidden group">
              <div>
                <img src={post.image} alt={post.title} className="w-full h-56 object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform duration-300" />
                <div className="flex items-center gap-4 text-xs text-gym-muted mb-2">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gym-primary" /> {post.date}</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-gym-primary" /> {post.author}</span>
                </div>
                <h3 className="text-2xl font-heading text-white uppercase mb-2 group-hover:text-gym-primary transition-colors">{post.title}</h3>
                <p className="text-xs text-gym-muted leading-relaxed mb-6">{post.summary}</p>
              </div>
              <Link to={`/blog/${post.slug}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Read Full Article
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};
