import * as LucideIcons from 'lucide-react';

// 1. Mapeo seguro de iconos
// Esto permite que en el JSON escribas "Shield" y React renderice el icono real.
export const IconMap: Record<string, React.ElementType> = {
  ...LucideIcons
};

// 2. Definición de los Tipos de Slide disponibles
// Solo permitiremos estos 3 diseños por ahora para mantener orden.
export type SlideType = 'hero' | 'grid' | 'split';

// 3. Estructura de un Item (para las listas o grids)
export interface FeatureItem {
  iconName: string; // Guardamos el nombre como string "Shield"
  title: string;
  text: string;
  highlight?: boolean;
}

// 4. Estructura Maestra de cada Diapositiva
export interface SlideData {
  id: string;
  type: SlideType;
  title?: string;
  subtitle?: string;
  content?: string | string[]; // Puede ser un texto largo o una lista de puntos
  image?: string;              // URL de la imagen (opcional)
  items?: FeatureItem[];       // Array de items (opcional, para grids)
  meta?: {                     // Configuraciones visuales extra
    gradient?: string;
    bgColor?: string;
  }; 
}