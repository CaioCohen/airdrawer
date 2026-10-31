import { Tensor } from "./tensor.js";
export interface Parameter { readonly name: string; readonly data: Tensor; readonly grad: Tensor; }
