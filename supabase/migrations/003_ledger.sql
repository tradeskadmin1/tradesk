CREATE TABLE IF NOT EXISTS public.ledger_balances (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id      INTEGER     NOT NULL,
  token_symbol  TEXT        NOT NULL,
  token_address TEXT        NOT NULL,
  balance       NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chain_id, token_address)
);

CREATE INDEX IF NOT EXISTS ledger_balances_user_idx ON public.ledger_balances (user_id);

ALTER TABLE public.ledger_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_balances: read own"
  ON public.ledger_balances FOR SELECT
  USING (auth.uid() = user_id);




CREATE TABLE IF NOT EXISTS public.ledger_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id      INTEGER     NOT NULL,
  token_symbol  TEXT        NOT NULL,
  token_address TEXT        NOT NULL,
  amount        NUMERIC(36, 18) NOT NULL,
  direction     TEXT        NOT NULL CHECK (direction IN ('credit', 'debit')),
  type          TEXT        NOT NULL CHECK (type IN (
                              'deposit',
                              'withdrawal',
                              'sweep',
                              'trade_buy',
                              'trade_sell',
                              'fee',
                              'adjustment'
                            )),
  ref_id        TEXT,
  note          TEXT,
  balance_after NUMERIC(36, 18) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_tx_user_idx    ON public.ledger_transactions (user_id);
CREATE INDEX IF NOT EXISTS ledger_tx_type_idx    ON public.ledger_transactions (type);
CREATE INDEX IF NOT EXISTS ledger_tx_created_idx ON public.ledger_transactions (created_at DESC);

ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_transactions: read own"
  ON public.ledger_transactions FOR SELECT
  USING (auth.uid() = user_id);


CREATE OR REPLACE FUNCTION public.credit_balance(
  p_user_id       UUID,
  p_chain_id      INTEGER,
  p_token_symbol  TEXT,
  p_token_address TEXT,
  p_amount        NUMERIC,
  p_type          TEXT DEFAULT 'deposit',
  p_ref_id        TEXT DEFAULT NULL,
  p_note          TEXT DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  INSERT INTO public.ledger_balances (user_id, chain_id, token_symbol, token_address, balance)
  VALUES (p_user_id, p_chain_id, p_token_symbol, p_token_address, p_amount)
  ON CONFLICT (user_id, chain_id, token_address)
  DO UPDATE SET
    balance    = public.ledger_balances.balance + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.ledger_transactions
    (user_id, chain_id, token_symbol, token_address, amount, direction, type, ref_id, note, balance_after)
  VALUES
    (p_user_id, p_chain_id, p_token_symbol, p_token_address, p_amount, 'credit', p_type, p_ref_id, p_note, v_new_balance);

  RETURN v_new_balance;
END;
$$;


CREATE OR REPLACE FUNCTION public.debit_balance(
  p_user_id       UUID,
  p_chain_id      INTEGER,
  p_token_symbol  TEXT,
  p_token_address TEXT,
  p_amount        NUMERIC,
  p_type          TEXT DEFAULT 'withdrawal',
  p_ref_id        TEXT DEFAULT NULL,
  p_note          TEXT DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance     NUMERIC;
BEGIN
  SELECT balance INTO v_current_balance
  FROM public.ledger_balances
  WHERE user_id = p_user_id
    AND chain_id = p_chain_id
    AND token_address = p_token_address
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'No balance record found for user % on chain % token %',
      p_user_id, p_chain_id, p_token_address;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %',
      v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE public.ledger_balances
  SET balance = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id
    AND chain_id = p_chain_id
    AND token_address = p_token_address;

  INSERT INTO public.ledger_transactions
    (user_id, chain_id, token_symbol, token_address, amount, direction, type, ref_id, note, balance_after)
  VALUES
    (p_user_id, p_chain_id, p_token_symbol, p_token_address, p_amount, 'debit', p_type, p_ref_id, p_note, v_new_balance);

  RETURN v_new_balance;
END;
$$;


NOTIFY pgrst, 'reload schema';
