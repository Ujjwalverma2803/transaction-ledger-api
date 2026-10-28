export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: Date;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  reference_id: string;
  created_at: Date;
}

export interface CreateAccountRequest {
  name: string;
}

export interface AddTransactionRequest {
  type: "credit" | "debit";
  amount: number;
  description: string;
  reference_id: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    page_size: number;
    total_records: number;
    total_pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
