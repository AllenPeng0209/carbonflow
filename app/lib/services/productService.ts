import { supabase } from '~/lib/supabase';
import type { Product, ProductFormData } from '~/types/supabase';

export class ProductService {
  // 获取所有产�?
  static async getAllProducts(): Promise<Product[]> {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw new Error(`获取产品列表失败: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      throw error;
    }
  }

  // 根据ID获取单个产品
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 产品不存�?
        }

        console.error('Error fetching product:', error);
        throw new Error(`获取产品失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getProductById:', error);
      throw error;
    }
  }

  // 创建新产�?
  static async createProduct(productData: ProductFormData): Promise<Product> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const newProduct = {
        ...productData,
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data, error } = await supabase.from('products').insert([newProduct]).select().single();

      if (error) {
        console.error('Error creating product:', error);
        throw new Error(`创建产品失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createProduct:', error);
      throw error;
    }
  }

  // 更新产品
  static async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const updateData = {
        ...productData,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select().single();

      if (error) {
        console.error('Error updating product:', error);
        throw new Error(`更新产品失败: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  }

  // 删除产品
  static async deleteProduct(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        throw new Error(`删除产品失败: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      throw error;
    }
  }

  // 搜索产品
  static async searchProducts(searchTerm: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,specification.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching products:', error);
        throw new Error(`搜索产品失败: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchProducts:', error);
      throw error;
    }
  }

  // 获取产品统计信息
  static async getProductStats(): Promise<{ total: number; recent: number }> {
    try {
      // 获取总数
      const { count: total, error: totalError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('Error getting total count:', totalError);
        throw new Error(`获取产品统计失败: ${totalError.message}`);
      }

      // 获取最�?天的产品数量
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recent, error: recentError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      if (recentError) {
        console.error('Error getting recent count:', recentError);
        throw new Error(`获取最近产品统计失�? ${recentError.message}`);
      }

      return {
        total: total || 0,
        recent: recent || 0,
      };
    } catch (error) {
      console.error('Error in getProductStats:', error);
      throw error;
    }
  }
}
