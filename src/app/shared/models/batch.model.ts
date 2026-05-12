export interface Batch {
  id: number;
  libraryId: number;
  name: string;
  startTime: string;
  endTime: string;
}

export interface CreateBatchDto {
  libraryId: number;
  name: string;
  startTime: string;
  endTime: string;
}
