CREATE POLICY "futures_orders: insert own"
  ON public.futures_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);


CREATE POLICY "futures_orders: update own"
  ON public.futures_orders FOR UPDATE
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
