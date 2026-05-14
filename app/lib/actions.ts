"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  // Test it out:
  console.log({ customerId, amount, status });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    console.log("insert data: ", { customerId, amountInCents, status, date });
  } catch (error) {
    console.error("Error inserting invoice: ", error);
    return {
      message: "Failed to create invoice. Please try again.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  try {
    console.log("update data: ", { id, customerId, amountInCents, status });
  } catch (error) {
    console.error("Error updating invoice: ", error);
    return {
      message: "Failed to update invoice. Please try again.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  throw new Error("Not implemented yet");

  console.log("delete invoice with id: ", id);
  revalidatePath("/dashboard/invoices");
}
