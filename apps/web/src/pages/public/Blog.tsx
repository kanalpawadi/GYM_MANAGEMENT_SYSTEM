import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, ArrowRight, User } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export const blogPosts = [
  {
    id: '1',
    title: '5 Essential Rules for Gaining Lean Muscle Mass',
    slug: '5-essential-rules-gaining-lean-muscle',
    summary: 'Master progressive overload, optimal protein intake, hydration, and sleep cycles to maximize your physique goals without excessive fat gain.',
    content: `Building lean muscle mass requires a scientific balance of progressive overload, caloric management, and deep tissue recovery.
    
1. **Progressive Overload**: Ensure you track your weights, reps, or sets weekly. Adding 1-2 kg or an extra repetition forces muscle hypertrophy.
2. **Protein Distribution**: Target 1.6g to 2.2g of protein per kg of body weight. Distribute this evenly across 4 meals (paneer, eggs, chicken breast, whey, or soya).
3. **Compound Movements First**: Prioritize barbell squats, bench press, overhead press, and Romanian deadlifts at the start of your training session.
4. **Hydration & Electrolytes**: Muscles are 75% water. Drink at least 3.5 to 4 liters of clean water daily.
5. **Sleep Quality**: Muscle tissue repair and human growth hormone release peak during deep REM sleep. Aim for 7 to 8 hours of quality rest every night.`,
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
    date: 'October 4, 2026',
    author: 'Coach Rahul Verma',
  },
  {
    id: '2',
    title: 'High-Protein Indian Meal Prep Blueprint',
    slug: 'high-protein-indian-meal-prep-guide',
    summary: 'Delicious paneer, chicken, chana, and soya recipes designed for busy Indian professionals striving for fat loss.',
    content: `Struggling to hit your daily protein intake on a standard Indian diet? Here is how to meal prep effortlessly for the entire week:

- **Paneer Bhurji & Soya Chunks**: 100g of paneer combined with 50g of boiled soya chunks delivers 35g of pure protein.
- **Tandoori Grilled Chicken Breast**: Marinate chicken breast in hung curd, lemon, and spices for an easy meal prep option.
- **Sprouted Moong & Chana Salad**: Add diced cucumber, tomatoes, and paneer cubes for a nutrient-dense snack.
- **Sattu Shakes**: Roasted chana flour (sattu) with cold water, roasted cumin, and black salt provides 15g of natural protein.`,
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80',
    date: 'October 1, 2026',
    author: 'Priya Patel (Nutritionist)',
  },
];

export const Blog: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Fitness & Diet Blog | RV-Fitness Gym</title>
        <meta name="description" content="Read expert workout plans, Indian diet advice, muscle building tips, and fat loss strategies on the RV-Fitness Gym blog." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">EXPERT KNOWLEDGE</span>
          <h1 className="text-5xl font-heading text-white tracking-wide uppercase mt-1">
            FITNESS & DIET <span className="text-gym-primary">BLOG</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Actionable fitness insights, Indian diet prep guides, and exercise science articles written by our certified coaches.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogPosts.map((post) => (
            <Card key={post.id} className="flex flex-col justify-between overflow-hidden group">
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
