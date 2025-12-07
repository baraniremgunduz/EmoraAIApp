-- Hesap silme fonksiyonu
-- Bu dosyayı Supabase SQL Editor'de çalıştırın
-- Supabase Dashboard > SQL Editor > New Query > Bu kodu yapıştırın > Run
-- Güvenlik: search_path set edildi (SQL injection koruması)

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Fonksiyonun çalıştığını test etmek için:
-- SELECT delete_user();

