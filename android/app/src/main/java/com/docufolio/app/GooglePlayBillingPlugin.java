package com.docufolio.app;

import android.app.Activity;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.AcknowledgePurchaseResponseListener;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "GooglePlayBillingPlugin")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private final Map<String, ProductDetails> cachedProductDetails = new HashMap<>();
    private PluginCall activePurchaseCall;

    @Override
    public void load() {
        super.load();
        initBillingClient();
    }

    private void initBillingClient() {
        try {
            PendingPurchasesParams pendingParams = PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build();

            billingClient = BillingClient.newBuilder(getContext())
                    .setListener(this)
                    .enablePendingPurchases(pendingParams)
                    .build();
        } catch (Exception e) {
            // Fallback for older billing client signatures if needed
            try {
                billingClient = BillingClient.newBuilder(getContext())
                        .setListener(this)
                        .enablePendingPurchases()
                        .build();
            } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        boolean available = (billingClient != null);
        ret.put("available", available);
        ret.put("isReady", billingClient != null && billingClient.isReady());
        call.resolve(ret);
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        if (billingClient == null) {
            initBillingClient();
        }

        if (billingClient == null) {
            call.reject("BillingClient could not be instantiated on this device.");
            return;
        }

        if (billingClient.isReady()) {
            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("message", "Already connected to Google Play Billing service.");
            call.resolve(ret);
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    JSObject ret = new JSObject();
                    ret.put("connected", true);
                    call.resolve(ret);
                } else {
                    call.reject("Google Play Billing setup failed with code: " + billingResult.getResponseCode() + ", " + billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Connection lost. It will be reconnected on next request.
            }
        });
    }

    @PluginMethod
    public void queryProductDetails(PluginCall call) {
        JSArray productIdsArray = call.getArray("productIds");
        String productTypeStr = call.getString("productType", "subs");

        if (productIdsArray == null || productIdsArray.length() == 0) {
            call.reject("productIds array cannot be empty");
            return;
        }

        ensureConnection(call, () -> {
            String productType = "inapp".equalsIgnoreCase(productTypeStr) 
                    ? BillingClient.ProductType.INAPP 
                    : BillingClient.ProductType.SUBS;

            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            for (int i = 0; i < productIdsArray.length(); i++) {
                try {
                    String id = productIdsArray.getString(i);
                    if (id != null && !id.trim().isEmpty()) {
                        productList.add(
                                QueryProductDetailsParams.Product.newBuilder()
                                        .setProductId(id.trim())
                                        .setProductType(productType)
                                        .build()
                        );
                    }
                } catch (JSONException ignored) {}
            }

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

            billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
                @Override
                public void onProductDetailsResponse(@NonNull BillingResult billingResult, @NonNull List<ProductDetails> list) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        JSArray results = new JSArray();
                        for (ProductDetails details : list) {
                            cachedProductDetails.put(details.getProductId(), details);

                            JSObject obj = new JSObject();
                            obj.put("productId", details.getProductId());
                            obj.put("title", details.getTitle());
                            obj.put("description", details.getDescription());
                            obj.put("productType", details.getProductType());

                            // Subscription pricing phases & offer tokens
                            if (details.getSubscriptionOfferDetails() != null && !details.getSubscriptionOfferDetails().isEmpty()) {
                                ProductDetails.SubscriptionOfferDetails offer = details.getSubscriptionOfferDetails().get(0);
                                obj.put("offerToken", offer.getOfferToken());
                                if (!offer.getPricingPhases().getPricingPhaseList().isEmpty()) {
                                    ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                                    obj.put("formattedPrice", phase.getFormattedPrice());
                                    obj.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                                    obj.put("priceAmountMicros", phase.getPriceAmountMicros());
                                    obj.put("billingPeriod", phase.getBillingPeriod());
                                }
                            } else if (details.getOneTimePurchaseOfferDetails() != null) {
                                ProductDetails.OneTimePurchaseOfferDetails oneTime = details.getOneTimePurchaseOfferDetails();
                                obj.put("formattedPrice", oneTime.getFormattedPrice());
                                obj.put("priceCurrencyCode", oneTime.getPriceCurrencyCode());
                                obj.put("priceAmountMicros", oneTime.getPriceAmountMicros());
                            }

                            results.put(obj);
                        }

                        JSObject ret = new JSObject();
                        ret.put("products", results);
                        call.resolve(ret);
                    } else {
                        call.reject("Failed to query product details: " + billingResult.getDebugMessage());
                    }
                }
            });
        });
    }

    @PluginMethod
    public void launchBillingFlow(PluginCall call) {
        String productId = call.getString("productId");
        String offerToken = call.getString("offerToken");
        String obfuscatedAccountId = call.getString("obfuscatedAccountId");

        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required to launch purchase flow");
            return;
        }

        ensureConnection(call, () -> {
            ProductDetails details = cachedProductDetails.get(productId);
            if (details == null) {
                // Query it first if not cached
                List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
                productList.add(
                        QueryProductDetailsParams.Product.newBuilder()
                                .setProductId(productId)
                                .setProductType(BillingClient.ProductType.SUBS)
                                .build()
                );
                QueryProductDetailsParams qParams = QueryProductDetailsParams.newBuilder()
                        .setProductList(productList)
                        .build();

                billingClient.queryProductDetailsAsync(qParams, (billingResult, list) -> {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) {
                        cachedProductDetails.put(productId, list.get(0));
                        doLaunchFlow(call, list.get(0), offerToken, obfuscatedAccountId);
                    } else {
                        call.reject("Product details not found for: " + productId);
                    }
                });
            } else {
                doLaunchFlow(call, details, offerToken, obfuscatedAccountId);
            }
        });
    }

    private void doLaunchFlow(PluginCall call, ProductDetails details, String offerToken, String obfuscatedAccountId) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Host Activity is null");
            return;
        }

        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
        BillingFlowParams.ProductDetailsParams.Builder builder = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details);

        // For subscriptions, offer token is required
        if (BillingClient.ProductType.SUBS.equals(details.getProductType())) {
            if (offerToken == null || offerToken.isEmpty()) {
                if (details.getSubscriptionOfferDetails() != null && !details.getSubscriptionOfferDetails().isEmpty()) {
                    offerToken = details.getSubscriptionOfferDetails().get(0).getOfferToken();
                }
            }
            if (offerToken != null) {
                builder.setOfferToken(offerToken);
            }
        }

        productDetailsParamsList.add(builder.build());

        BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(productDetailsParamsList);

        if (obfuscatedAccountId != null && !obfuscatedAccountId.isEmpty()) {
            flowBuilder.setObfuscatedAccountId(obfuscatedAccountId);
        }

        activePurchaseCall = call;

        BillingResult result = billingClient.launchBillingFlow(activity, flowBuilder.build());
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            activePurchaseCall = null;
            call.reject("Launch billing flow failed: " + result.getDebugMessage() + " (Code: " + result.getResponseCode() + ")");
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, @Nullable List<Purchase> purchases) {
        if (activePurchaseCall == null) return;

        PluginCall call = activePurchaseCall;
        activePurchaseCall = null;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            JSArray purchasesArray = new JSArray();
            for (Purchase p : purchases) {
                JSObject purchaseObj = serializePurchase(p);
                purchasesArray.put(purchaseObj);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("purchases", purchasesArray);
            call.resolve(ret);
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("cancelled", true);
            ret.put("message", "User cancelled Google Play purchase.");
            call.resolve(ret);
        } else {
            call.reject("Purchase failed: " + billingResult.getDebugMessage() + " (Code: " + billingResult.getResponseCode() + ")");
        }
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.isEmpty()) {
            call.reject("purchaseToken is required");
            return;
        }

        ensureConnection(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchaseToken)
                    .build();

            billingClient.acknowledgePurchase(params, new AcknowledgePurchaseResponseListener() {
                @Override
                public void onAcknowledgePurchaseResponse(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        JSObject ret = new JSObject();
                        ret.put("acknowledged", true);
                        call.resolve(ret);
                    } else {
                        call.reject("Failed to acknowledge purchase: " + billingResult.getDebugMessage());
                    }
                }
            });
        });
    }

    @PluginMethod
    public void queryPurchases(PluginCall call) {
        String productTypeStr = call.getString("productType", "subs");
        String productType = "inapp".equalsIgnoreCase(productTypeStr) 
                ? BillingClient.ProductType.INAPP 
                : BillingClient.ProductType.SUBS;

        ensureConnection(call, () -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                    .setProductType(productType)
                    .build();

            billingClient.queryPurchasesAsync(params, new PurchasesResponseListener() {
                @Override
                public void onQueryPurchasesResponse(@NonNull BillingResult billingResult, @NonNull List<Purchase> purchases) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        JSArray results = new JSArray();
                        for (Purchase p : purchases) {
                            results.put(serializePurchase(p));
                        }
                        JSObject ret = new JSObject();
                        ret.put("purchases", results);
                        call.resolve(ret);
                    } else {
                        call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                    }
                }
            });
        });
    }

    @PluginMethod
    public void consumePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null || purchaseToken.isEmpty()) {
            call.reject("purchaseToken is required");
            return;
        }

        ensureConnection(call, () -> {
            ConsumeParams params = ConsumeParams.newBuilder()
                    .setPurchaseToken(purchaseToken)
                    .build();

            billingClient.consumeAsync(params, new ConsumeResponseListener() {
                @Override
                public void onConsumeResponse(@NonNull BillingResult billingResult, @NonNull String s) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        JSObject ret = new JSObject();
                        ret.put("consumed", true);
                        call.resolve(ret);
                    } else {
                        call.reject("Failed to consume purchase: " + billingResult.getDebugMessage());
                    }
                }
            });
        });
    }

    private void ensureConnection(PluginCall call, Runnable action) {
        if (billingClient == null) {
            initBillingClient();
        }

        if (billingClient != null && billingClient.isReady()) {
            action.run();
        } else if (billingClient != null) {
            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        action.run();
                    } else {
                        call.reject("Connection to Google Play failed: " + billingResult.getDebugMessage());
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    call.reject("Google Play Billing service disconnected.");
                }
            });
        } else {
            call.reject("BillingClient is null on this device.");
        }
    }

    private JSObject serializePurchase(Purchase p) {
        JSObject obj = new JSObject();
        obj.put("orderId", p.getOrderId());
        obj.put("purchaseToken", p.getPurchaseToken());
        obj.put("purchaseTime", p.getPurchaseTime());
        obj.put("purchaseState", p.getPurchaseState());
        obj.put("isAcknowledged", p.isAcknowledged());
        obj.put("isAutoRenewing", p.isAutoRenewing());
        obj.put("originalJson", p.getOriginalJson());
        obj.put("signature", p.getSignature());

        JSArray products = new JSArray();
        for (String prodId : p.getProducts()) {
            products.put(prodId);
        }
        obj.put("products", products);
        return obj;
    }
}
