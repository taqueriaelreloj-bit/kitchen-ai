import { KitchenDesign, PriceEstimate, RoomModel } from './types';
const counterRate = { quartz: 1450, granite: 1200, laminate: 650 } as const;
export function estimatePrice(room: RoomModel, design: KitchenDesign): PriceEstimate {
  const linearM = room.layout === 'L' ? room.widthM + room.lengthM : room.lengthM * 2;
  const cabinets = Math.round(linearM * (design.cabinetColor === 'wood' ? 2550 : 2100));
  const countertops = Math.round(linearM * counterRate[design.countertop]);
  const fixtures = design.includesIsland ? 4200 : 2600;
  const installation = Math.round((cabinets + countertops + fixtures) * 0.22);
  const total = cabinets + countertops + fixtures + installation;
  return { cabinets, countertops, fixtures, installation, total, low: Math.round(total * 0.9), high: Math.round(total * 1.15) };
}
