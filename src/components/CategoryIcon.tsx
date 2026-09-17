import React from 'react';
import {
  Home,
  Utensils,
  Car,
  HeartPulse,
  Sparkles,
  GraduationCap,
  Tv,
  Layers,
  Briefcase,
  Laptop,
  TrendingUp,
  CircleDollarSign,
  Landmark,
  Building2,
  CreditCard,
  ShieldCheck,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4' }) => {
  switch (name) {
    case 'Home': return <Home className={className} />;
    case 'Utensils': return <Utensils className={className} />;
    case 'Car': return <Car className={className} />;
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'GraduationCap': return <GraduationCap className={className} />;
    case 'Tv': return <Tv className={className} />;
    case 'Layers': return <Layers className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    case 'Laptop': return <Laptop className={className} />;
    case 'TrendingUp': return <TrendingUp className={className} />;
    case 'CircleDollarSign': return <CircleDollarSign className={className} />;
    case 'Landmark': return <Landmark className={className} />;
    case 'Building2': return <Building2 className={className} />;
    case 'CreditCard': return <CreditCard className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Wallet': return <Wallet className={className} />;
    case 'ArrowUpRight': return <ArrowUpRight className={className} />;
    case 'ArrowDownLeft': return <ArrowDownLeft className={className} />;
    default: return <DollarSign className={className} />;
  }
};
