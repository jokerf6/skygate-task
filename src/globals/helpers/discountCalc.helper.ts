// import { DiscountServiceType } from "@prisma/client";

// export const calcPriceAfterDiscount = (discount:number,discountType:DiscountServiceType,price:number)  => {
//   if(discountType&&(!discount||!price)){
//     return price;
//   }
//   if(discountType === DiscountServiceType.PERCENTAGE){
//     return price - (price * discount / 100);
// }else if(discountType === DiscountServiceType.AMOUNT){
//     return price - discount;
//   }else{
//     return price;
//   }
// };