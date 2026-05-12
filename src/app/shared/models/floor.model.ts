export interface Floor {
  id: number;
  libraryId: number;
  name: string;
  floorNumber: number;
  isActive: boolean;
}

export interface CreateFloorDto {
  libraryId: number;
  name: string;
  floorNumber: number;
}
