export interface NairaNoteCount {
  denomination: 5 | 10 | 20 | 50 | 100 | 200 | 500 | 1000;
  count: number;
  subtotal: number;
}

export interface NairaDetectionResponse {
  is_naira_detected: boolean;
  is_uncertain: boolean;
  notes: NairaNoteCount[];
  total_amount: number;
  currency: string;
  other_currency_detected?: string | null;
  spoken_summary: string;
  retake_guidance?: string | null;
}

export interface ObjectRecognitionResponse {
  spoken_summary: string;
  detected_objects: string[];
  dominant_colors: string[];
  is_uncertain: boolean;
  safety_note: string;
}

export interface TextEntity {
  label: string;
  value: string;
}

export interface TextReadingResponse {
  has_text: boolean;
  extracted_text: string;
  summary: string;
  important_details: TextEntity[];
  spoken_summary: string;
  is_uncertain: boolean;
}
