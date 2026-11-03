export type IndianRetailerId =
  | 'amazon-in'
  | 'flipkart'
  | 'croma'
  | 'vijay-sales'
  | 'reliance-digital'
  | 'mdcomputers'
  | 'vedant-computers'
  | 'primeabgb'
  | 'lenovo-in'
  | 'asus-in'
  | 'external-in';

export type PaymentInstrument =
  'hdfc-cc' | 'icici-cc' | 'sbi-cc' | 'axis-cc' | 'kotak-cc' | 'amazon-pay-icici' | 'flipkart-axis' | 'upi';

export type ProductCondition = 'new' | 'refurbished' | 'open_box';

export type ProductCategory = 'laptop' | 'gpu' | 'cpu' | 'audio' | 'console' | 'monitor' | 'electronics';

export interface ProductSpecs {
  brand?: string;
  series?: string;
  mpn?: string;
  gtin?: string;
  cpu?: string;
  gpu?: string;
  vramGb?: number;
  ramGb?: number;
  storageGb?: number;
  displayInches?: number;
  refreshHz?: number;
  condition?: ProductCondition;
}

export type PriceRuleGroup = 'mandatory_fee' | 'store_coupon' | 'payment_offer' | 'exchange';

export type PriceRuleKind =
  | 'shipping_fee'
  | 'platform_fee'
  | 'coupon_flat'
  | 'coupon_pct'
  | 'bank_instant_flat'
  | 'bank_instant_pct'
  | 'card_cashback_pct'
  | 'exchange_bonus';

export interface PriceRule {
  id: string;
  kind: PriceRuleKind;
  exclusivityGroup: PriceRuleGroup;
  label: string;
  amountPaise?: number;
  rateBps?: number;
  minOrderPaise?: number;
  maxDiscountPaise?: number;
  paymentInstrument?: PaymentInstrument;
  couponCode?: string;
}

export interface AppliedPriceAdjustment {
  ruleId: string;
  label: string;
  exclusivityGroup: PriceRuleGroup;
  deltaPaise: number;
  paymentInstrument?: PaymentInstrument;
}

export interface UserWalletProfile {
  instruments: PaymentInstrument[];
  includeExchange?: boolean;
}

export interface EffectivePriceBreakdown {
  basePricePaise: number;
  mandatoryFeesPaise: number;
  storeCouponDiscountPaise: number;
  unconditionalPricePaise: number;
  conditionalDiscountPaise: number;
  bestConditionalPricePaise: number;
  selectedPaymentInstrument?: PaymentInstrument;
  selectedPaymentLabel?: string;
  adjustments: AppliedPriceAdjustment[];
}

export interface RawRetailerOffer {
  id: string;
  retailerId: IndianRetailerId;
  retailerName: string;
  externalId: string;
  rawTitle: string;
  canonicalUrl: string;
  imageUrl?: string;
  basePricePaise: number;
  mrpPaise?: number;
  inStock: boolean;
  condition: ProductCondition;
  mpn?: string;
  gtin?: string;
  category?: ProductCategory;
  priceRules: PriceRule[];
  lastVerifiedAt: string;
}

export interface EnrichedRetailerOffer extends RawRetailerOffer {
  extractedSpecs: ProductSpecs;
  pricing: EffectivePriceBreakdown;
  matchConfidence: number;
}

export interface CanonicalProductGroup {
  slug: string;
  canonicalTitle: string;
  category: ProductCategory;
  imageUrl?: string;
  specs: ProductSpecs;
  offers: EnrichedRetailerOffer[];
  similarOffers: EnrichedRetailerOffer[];
  bestUnconditionalOffer: EnrichedRetailerOffer;
  bestConditionalOffer: EnrichedRetailerOffer;
}

export interface PriceSpan {
  id: string;
  offerId: string;
  retailerId: IndianRetailerId;
  basePricePaise: number;
  unconditionalPricePaise: number;
  bestConditionalPricePaise: number;
  inStock: boolean;
  validFrom: string;
  lastVerifiedAt: string;
  endedAt: string | null;
}

export type DealVerdict = 'all_time_low' | 'great_deal' | 'fair_price' | 'inflated_hike' | 'above_typical';

export interface PriceHistorySummary {
  currentPaise: number;
  allTimeLowPaise: number;
  allTimeHighPaise: number;
  median90dPaise: number;
  vsMedianBps: number;
  preSaleHikeDetected: boolean;
  verdict: DealVerdict;
  verdictReason: string;
}

export interface StepChartPoint {
  x: number;
  y: number;
  pricePaise: number;
  timestamp: string;
}

export interface StepChartGeometry {
  width: number;
  height: number;
  stepPath: string;
  areaPath: string;
  allTimeLowY: number;
  medianY: number;
  targetY: number | null;
  minLabelPaise: number;
  maxLabelPaise: number;
  points: StepChartPoint[];
}

export type WatchTriggerMode = 'target_price' | 'pct_drop' | 'any_drop' | 'all_time_low' | 'restock';

export type WatchPriceBasis = 'unconditional' | 'best_conditional';

export type WatchLifecycleState = 'armed' | 'triggered' | 'paused';

export interface WatchRule {
  id: string;
  label: string;
  productSlug?: string;
  specQuery?: ProductSpecs;
  category?: ProductCategory;
  triggerMode: WatchTriggerMode;
  priceBasis: WatchPriceBasis;
  baselinePricePaise: number;
  targetPricePaise?: number;
  dropPctTarget?: number;
  lastAlertedPricePaise: number | null;
  lastAlertedAt: string | null;
  aboveRearmSince: string | null;
  state: WatchLifecycleState;
  discordWebhookUrl: string;
  walletInstruments: PaymentInstrument[];
  createdAt: string;
}

export interface AlertEvaluationResult {
  shouldAlert: boolean;
  reason: string;
  observedPricePaise: number;
  nextState: WatchLifecycleState;
  nextLastAlertedPricePaise: number | null;
  nextLastAlertedAt: string | null;
  nextAboveRearmSince: string | null;
}

export type ParsedSearchInput =
  | {
      kind: 'url';
      raw: string;
      canonicalUrl: string;
      retailerId: IndianRetailerId;
      externalId?: string;
    }
  | {
      kind: 'query';
      raw: string;
      normalizedQuery: string;
      category?: ProductCategory;
      specs: ProductSpecs;
      maxBudgetPaise?: number;
    };
