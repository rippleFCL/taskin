import { useState, useEffect } from "react";
import { getCategories } from "../client/sdk.gen";
import { apiClient } from "../client/sdk.gen";
import { GetCategoryResponse } from "../api/types";

export const useCategories = () => {
  const [categories, setCategories] = useState(true);

  useEffect(() => {
    getCategories({ client: apiClient })
      .then((response: GetCategoryResponse) => {
        setCategories(response.categories);
      })
      .catch((error: any) => {
        console.error('Error:', error);
        setCategories([]);
      })
      .finally(() => {
        console.log('Finally');
      }),
  }, []);

  return [categories, setCategories] as const; // infers [boolean, typeof setApiResponse] instead of (boolean | typeof setApiResponse)[]
}
