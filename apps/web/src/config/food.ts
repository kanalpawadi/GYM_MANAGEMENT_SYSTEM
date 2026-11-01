/** Member food type, asked at registration (migration 20). */
export type FoodType = 'veg' | 'nonveg' | 'veg_egg';

export const FOOD_TYPES: { value: FoodType; label: string; short: string; dot: string }[] = [
  { value: 'veg', label: 'Pure Veg', short: 'Veg', dot: 'bg-green-500' },
  { value: 'nonveg', label: 'Non-Veg', short: 'Non-Veg', dot: 'bg-red-500' },
  { value: 'veg_egg', label: 'Veg + Egg', short: 'Veg + Egg', dot: 'bg-yellow-400' },
];

export const foodLabel = (value?: string | null) => FOOD_TYPES.find((f) => f.value === value)?.label ?? null;
