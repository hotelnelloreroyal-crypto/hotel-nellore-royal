import React from 'react';

const ThermalBill = React.forwardRef(({ billData }, ref) => {
  if (!billData) return null;

  const {
    billNo = 'N/A',
    orderNo = 'N/A',
    kotNo = 'N/A',
    date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type = 'Dine In',
    table = 'N/A',
    user = 'Admin',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    totalAmount = 0,
    totalQty = 0,
    paymentMethod = null,
    splitPayment = null,
    amountReceived = 0,
    change = 0
  } = billData;

  // Restaurant details from env
  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'HR FOOD COURT';
  const restaurantMobile = import.meta.env.VITE_RESTAURANT_MOBILE || '9966850426';
  const restaurantAddress = import.meta.env.VITE_RESTAURANT_ADDRESS || '';
  const restaurantGST = import.meta.env.VITE_RESTAURANT_GST || '';

  return (
    <div ref={ref} className="thermal-bill-container p-2 bg-white text-black font-mono text-[9px] uppercase leading-tight w-full mx-auto print:block hidden">
      <div className="text-center mb-3">
        <h1 className="font-bold text-sm mb-1">{restaurantName}</h1>
        <p className="text-[10px]">{restaurantAddress}</p>
        <p className="text-[10px]">Contact No: {restaurantMobile}</p>
        {restaurantGST && restaurantGST.trim() !== '' && (
          <p className="text-[10px]">GST: {restaurantGST}</p>
        )}
      </div>

      <div className="flex justify-between mb-1 text-[10px]">
        <span>{date} {time}</span>
        <span>{type}</span>
      </div>

      <div className="text-center font-bold mb-2 border-y border-double border-black py-1">
        <p className="text-[12px] uppercase tracking-wider">Bill No : {billNo}</p>
        <p className="text-xs uppercase tracking-widest">Order No: {orderNo}</p>
        <p className="text-[10px]">KOT No : {kotNo}</p>
      </div>

      <div className="flex justify-between border-b border-dashed border-black pb-1 mb-2 text-[8px] font-bold">
        <span>Table: {table}</span>
        <span>User: {user}</span>
      </div>

      <table className="w-full mb-2 text-[10px]">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Item</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-right py-1">Rate</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-1 pr-1">{index + 1}. {item.name}</td>
              <td className="text-right py-1">{item.quantity}</td>
              <td className="text-right py-1">₹{item.price}</td>
              <td className="text-right py-1 font-bold">₹{item.price * item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-1 mb-2">
        <div className="flex justify-between text-[9px]">
          <span>Total Items: {totalQty}</span>
          <span className="font-bold">Subtotal: ₹{subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-[9px] text-green-700">
            <span>Discount:</span>
            <span>- ₹{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-sm mt-1 pt-1 border-t border-dashed border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
        
        {/* Payment Details */}
        {paymentMethod && (
          <div className="mt-2 pt-2 border-t border-dashed border-black">
            {paymentMethod === 'split' && splitPayment ? (
              <>
                <p className="text-[9px] font-bold mb-1">PAYMENT (SPLIT):</p>
                {splitPayment.cash > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span>Cash:</span>
                    <span>₹{splitPayment.cash.toFixed(2)}</span>
                  </div>
                )}
                {splitPayment.card > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span>Card:</span>
                    <span>₹{splitPayment.card.toFixed(2)}</span>
                  </div>
                )}
                {splitPayment.upi > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span>UPI:</span>
                    <span>₹{splitPayment.upi.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between text-[9px]">
                <span>PAYMENT ({paymentMethod.toUpperCase()}):</span>
                <span>₹{amountReceived.toFixed(2)}</span>
              </div>
            )}
            {change > 0 && (
              <div className="flex justify-between text-[9px] font-bold">
                <span>Change:</span>
                <span>₹{change.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center mt-3 pt-2 border-t border-double border-black text-[10px]">
        <p className="font-bold mb-1 italic">Thank you for visiting!</p>
      </div>
    </div>
  );
});

ThermalBill.displayName = 'ThermalBill';

export default ThermalBill;
