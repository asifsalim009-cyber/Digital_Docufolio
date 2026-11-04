const fs = require('fs');
let code = fs.readFileSync('components/Monetization.tsx', 'utf8');

if (!code.includes('GooglePayButton')) {
  code = code.replace(
    `import { Capacitor } from '@capacitor/core';`,
    `import { Capacitor } from '@capacitor/core';\nimport GooglePayButton from '@google-pay/button-react';`
  );

  const mpesaButton = `                  <button
                    onClick={handleMpesaPay}
                    disabled={phoneNumber.length < 10}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:shadow-none transition-all text-base flex items-center justify-center gap-2"
                  >
                    <Zap size={18} />
                    <span>{isAndroid ? 'Proceed to Google Play' : 'Send STK Push Prompt'}</span>
                  </button>`;

  const gPayButton = `                  <div className="w-full mt-4 flex justify-center">
                    <GooglePayButton
                      environment="TEST"
                      paymentRequest={{
                        apiVersion: 2,
                        apiVersionMinor: 0,
                        allowedPaymentMethods: [
                          {
                            type: 'CARD',
                            parameters: {
                              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                              allowedCardNetworks: ['MASTERCARD', 'VISA'],
                            },
                            tokenizationSpecification: {
                              type: 'PAYMENT_GATEWAY',
                              parameters: {
                                gateway: 'example',
                                gatewayMerchantId: 'exampleGatewayMerchantId',
                              },
                            },
                          },
                        ],
                        merchantInfo: {
                          merchantId: '12345678901234567890',
                          merchantName: 'Digital DocuFolio',
                        },
                        transactionInfo: {
                          totalPriceStatus: 'FINAL',
                          totalPriceLabel: 'Total',
                          totalPrice: billingCycle === 'yearly' ? selectedPlan.price.yearlyNum.toString() : selectedPlan.price.monthlyNum.toString(),
                          currencyCode: 'USD',
                          countryCode: 'US',
                        },
                      }}
                      onLoadPaymentData={paymentRequest => {
                        console.log('Success', paymentRequest);
                        setPaymentStatus('processing');
                        setTimeout(() => {
                           setPaymentStatus('success');
                           setTimeout(() => {
                             if (selectedPlan) {
                               onUpgrade(selectedPlan.id);
                             }
                             setShowMpesaModal(false);
                           }, 2200);
                        }, 2800);
                      }}
                      buttonColor="black"
                      buttonType="subscribe"
                      style={{ width: '100%' }}
                    />
                  </div>`;
  
  code = code.replace(mpesaButton, mpesaButton + "\n" + gPayButton);
}
fs.writeFileSync('components/Monetization.tsx', code);
