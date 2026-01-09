// src/components/ui/DynamicIcon.tsx
import React from 'react';
import { IconMap } from '../../types/presentation';
import { HelpCircle } from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
}

export const DynamicIcon = ({ name, className }: DynamicIconProps) => {
  // Busca el icono en el mapa. Si no existe (por un typo), usa HelpCircle para no romper la app.
  const IconComponent = IconMap[name] || HelpCircle;
  
  return <IconComponent className={className} />;
};