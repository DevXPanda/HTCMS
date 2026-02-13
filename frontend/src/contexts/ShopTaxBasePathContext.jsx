import React, { createContext, useContext } from 'react';

const ShopTaxBasePathContext = createContext('');

export const useShopTaxBasePath = () => useContext(ShopTaxBasePathContext);

export const ShopTaxBasePathProvider = ({ basePath = '', children }) => (
  <ShopTaxBasePathContext.Provider value={basePath}>
    {children}
  </ShopTaxBasePathContext.Provider>
);
