-- Create storage bucket for expense attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-attachments', 'expense-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for expense attachments
CREATE POLICY "Users can upload their own expense attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'expense-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own expense attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'expense-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Approvers can view expense attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'expense-attachments' AND
  EXISTS (
    SELECT 1 FROM expense_requests er
    WHERE er.id::text = (storage.foldername(name))[1]
    AND (er.current_approver = auth.uid() OR er.submitted_by = auth.uid())
  )
);
