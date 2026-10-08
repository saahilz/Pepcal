/** Calculate body mass index from weight in kilograms and height in centimeters. */
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

/** Calculate body mass index from weight in kilograms and height in centimeters. */
export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;

  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** Classify a valid BMI using standard adult reference ranges. */
export function bmiCategory(bmi: number): BmiCategory | null {
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}
