import { atom } from "jotai";
import { WidgetScreen } from "@/modules/widget/types";

//BAsic widget state atom
export const screenAtom = atom<WidgetScreen>("auth");