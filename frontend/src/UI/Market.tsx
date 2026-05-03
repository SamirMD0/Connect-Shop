import React from 'react';
import styled from 'styled-components';

const Card = () => {
  return (
    <StyledWrapper>
      <div className="receipt">
        <p className="shop-name">UI Market</p>
        <p className="info">
          1234 Market Street, Suite 101<br />
          City, State ZIP<br />
          Date: 12/27/2025<br />
          Time: 03:15 PM
        </p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Item 1</td>
              <td>2</td>
              <td>$20.00</td>
            </tr>
            <tr>
              <td>Item 2</td>
              <td>1</td>
              <td>$10.00</td>
            </tr>
            <tr>
              <td>Item 3</td>
              <td>3</td>
              <td>$15.00</td>
            </tr>
          </tbody>
        </table>
        <div className="total">
          <p>Total:</p>
          <p>$45.00</p>
        </div>
        <p className="thanks">Thank you for shopping with us!</p>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .receipt {
    width: 250px;
    background: white;
    border: 2px dashed #ccc;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .shop-name {
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 10px;
  }

  .info {
    text-align: center;
    font-size: 0.85rem;
    margin-bottom: 15px;
  }

  .receipt table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 0.85rem;
  }

  .receipt table th,
  .receipt table td {
    padding: 4px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  .total {
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 15px;
  }

  .barcode {
    display: flex;
    justify-content: center;
    margin-top: 15px;
  }

  .thanks {
    font-size: 0.85rem;
    text-align: center;
    margin-top: 10px;
  }`;

export default Card;
