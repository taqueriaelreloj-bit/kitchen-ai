import { KitchenDesign, RoomModel } from './types';
export function generateDesigns(room: RoomModel): KitchenDesign[] {
  const island = room.widthM >= 3.5 && room.lengthM >= 3.8;
  return [
    { id: `${room.id}-warm`, name: 'Cálida y luminosa', description: 'Madera natural, tonos crema y una cocina acogedora.', style: 'warm', cabinetColor: 'cream', countertop: 'quartz', accent: '#C97941', includesIsland: island },
    { id: `${room.id}-modern`, name: 'Moderna y serena', description: 'Líneas limpias, gabinetes blancos y contraste suave.', style: 'modern', cabinetColor: 'white', countertop: 'granite', accent: '#486A68', includesIsland: island },
    { id: `${room.id}-classic`, name: 'Clásica renovada', description: 'Detalles atemporales y almacenamiento generoso.', style: 'classic', cabinetColor: 'navy', countertop: 'quartz', accent: '#324A66', includesIsland: false },
  ];
}
