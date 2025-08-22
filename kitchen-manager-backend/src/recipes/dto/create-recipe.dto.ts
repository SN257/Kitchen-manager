export class CreateRecipeDto {
  vangiName: string;
  ingredients: { ingredientName: string; kg: number }[];
  items_per_kg: number;
  userId: number;
}
