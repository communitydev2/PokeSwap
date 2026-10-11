import { create } from 'zustand';

type AddedToastState = {
  message: string | null;
  seq: number;
  show: (message: string) => void;
};

export const useAddedToastStore = create<AddedToastState>((set) => ({
  message: null,
  seq: 0,
  show: (message) => set((state) => ({ message, seq: state.seq + 1 })),
}));
