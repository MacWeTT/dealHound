import type {
  AppliedPriceAdjustment,
  EffectivePriceBreakdown,
  PaymentInstrument,
  PriceRule,
  UserWalletProfile,
} from '@/domain/types';

const evaluateBenefitPaise = (rule: PriceRule, eligibleAmountPaise: number): number => {
  const { minOrderPaise, amountPaise, rateBps, maxDiscountPaise } = rule;

  if (minOrderPaise !== undefined && eligibleAmountPaise < minOrderPaise) {
    return 0;
  }

  let benefit = 0;

  if (amountPaise !== undefined) {
    benefit = amountPaise;
  } else if (rateBps !== undefined) {
    benefit = Math.round((eligibleAmountPaise * rateBps) / 10_000);
  }

  if (maxDiscountPaise !== undefined && benefit > maxDiscountPaise) {
    benefit = maxDiscountPaise;
  }

  return Math.max(0, Math.min(benefit, eligibleAmountPaise));
};

const isPaymentAllowed = (instrument: PaymentInstrument | undefined, wallet?: UserWalletProfile): boolean => {
  if (!wallet) {
    return true;
  }

  const { instruments } = wallet;

  if (!instrument) {
    return true;
  }

  return instruments.includes(instrument);
};

interface CandidatePlan {
  finalPricePaise: number;
  couponRule: PriceRule | null;
  couponDiscountPaise: number;
  paymentRule: PriceRule | null;
  paymentDiscountPaise: number;
  exchangeRule: PriceRule | null;
  exchangeDiscountPaise: number;
}

export const calculateEffectivePrice = (
  basePricePaise: number,
  rules: PriceRule[],
  wallet?: UserWalletProfile,
): EffectivePriceBreakdown => {
  const feeRules = rules.filter(rule => {
    return rule.exclusivityGroup === 'mandatory_fee';
  });
  const couponRules = rules.filter(rule => {
    return rule.exclusivityGroup === 'store_coupon';
  });
  const paymentRules = rules.filter(rule => {
    const { exclusivityGroup, paymentInstrument } = rule;

    return exclusivityGroup === 'payment_offer' && isPaymentAllowed(paymentInstrument, wallet);
  });
  const includeExchange = wallet?.includeExchange === true;
  const exchangeRules = includeExchange
    ? rules.filter(rule => {
        return rule.exclusivityGroup === 'exchange';
      })
    : [];

  let mandatoryFeesPaise = 0;
  const feeAdjustments: AppliedPriceAdjustment[] = [];

  for (const feeRule of feeRules) {
    const { id, label, amountPaise, minOrderPaise } = feeRule;
    const waivesAbove = minOrderPaise !== undefined && basePricePaise >= minOrderPaise;
    const fee = waivesAbove ? 0 : (amountPaise ?? 0);

    if (fee > 0) {
      mandatoryFeesPaise += fee;
      feeAdjustments.push({
        ruleId: id,
        label,
        exclusivityGroup: 'mandatory_fee',
        deltaPaise: fee,
      });
    }
  }

  let bestUnconditionalCoupon: PriceRule | null = null;
  let bestUnconditionalCouponDiscount = 0;

  for (const coupon of couponRules) {
    const discount = evaluateBenefitPaise(coupon, basePricePaise);

    if (discount > bestUnconditionalCouponDiscount) {
      bestUnconditionalCouponDiscount = discount;
      bestUnconditionalCoupon = coupon;
    }
  }

  const unconditionalPricePaise = Math.max(0, basePricePaise + mandatoryFeesPaise - bestUnconditionalCouponDiscount);

  const couponChoices: Array<PriceRule | null> = [null, ...couponRules];
  const paymentChoices: Array<PriceRule | null> = [null, ...paymentRules];
  const exchangeChoices: Array<PriceRule | null> = [null, ...exchangeRules];

  let bestPlan: CandidatePlan = {
    finalPricePaise: unconditionalPricePaise,
    couponRule: bestUnconditionalCoupon,
    couponDiscountPaise: bestUnconditionalCouponDiscount,
    paymentRule: null,
    paymentDiscountPaise: 0,
    exchangeRule: null,
    exchangeDiscountPaise: 0,
  };

  for (const couponChoice of couponChoices) {
    const couponDiscount = couponChoice ? evaluateBenefitPaise(couponChoice, basePricePaise) : 0;
    const netAfterCoupon = Math.max(0, basePricePaise - couponDiscount);

    for (const exchangeChoice of exchangeChoices) {
      const exchangeDiscount = exchangeChoice ? evaluateBenefitPaise(exchangeChoice, netAfterCoupon) : 0;
      const netBeforePayment = Math.max(0, netAfterCoupon - exchangeDiscount);

      for (const paymentChoice of paymentChoices) {
        const paymentDiscount = paymentChoice ? evaluateBenefitPaise(paymentChoice, netBeforePayment) : 0;
        const totalPrice = Math.max(0, netBeforePayment + mandatoryFeesPaise - paymentDiscount);

        if (totalPrice < bestPlan.finalPricePaise) {
          bestPlan = {
            finalPricePaise: totalPrice,
            couponRule: couponDiscount > 0 ? couponChoice : null,
            couponDiscountPaise: couponDiscount,
            paymentRule: paymentDiscount > 0 ? paymentChoice : null,
            paymentDiscountPaise: paymentDiscount,
            exchangeRule: exchangeDiscount > 0 ? exchangeChoice : null,
            exchangeDiscountPaise: exchangeDiscount,
          };
        }
      }
    }
  }

  const {
    finalPricePaise,
    couponRule,
    couponDiscountPaise,
    paymentRule,
    paymentDiscountPaise,
    exchangeRule,
    exchangeDiscountPaise,
  } = bestPlan;

  const adjustments: AppliedPriceAdjustment[] = [...feeAdjustments];

  if (couponRule && couponDiscountPaise > 0) {
    const { id, label } = couponRule;

    adjustments.push({
      ruleId: id,
      label,
      exclusivityGroup: 'store_coupon',
      deltaPaise: -couponDiscountPaise,
    });
  }

  if (exchangeRule && exchangeDiscountPaise > 0) {
    const { id, label } = exchangeRule;

    adjustments.push({
      ruleId: id,
      label,
      exclusivityGroup: 'exchange',
      deltaPaise: -exchangeDiscountPaise,
    });
  }

  let selectedPaymentInstrument: PaymentInstrument | undefined;
  let selectedPaymentLabel: string | undefined;

  if (paymentRule && paymentDiscountPaise > 0) {
    const { id, label, paymentInstrument } = paymentRule;

    selectedPaymentInstrument = paymentInstrument;
    selectedPaymentLabel = label;
    adjustments.push({
      ruleId: id,
      label,
      exclusivityGroup: 'payment_offer',
      deltaPaise: -paymentDiscountPaise,
      paymentInstrument,
    });
  }

  return {
    basePricePaise,
    mandatoryFeesPaise,
    storeCouponDiscountPaise: bestUnconditionalCouponDiscount,
    unconditionalPricePaise,
    conditionalDiscountPaise: paymentDiscountPaise + exchangeDiscountPaise,
    bestConditionalPricePaise: finalPricePaise,
    selectedPaymentInstrument,
    selectedPaymentLabel,
    adjustments,
  };
};

