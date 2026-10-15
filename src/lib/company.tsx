import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const COMPANIES = [
  {
    id: "c42520ea-c682-4090-a41a-a6b2d03f9087",
    name: "SODFA",
    type: "business",
  },
  {
    id: "57bade9c-6b21-486a-a0d5-9e5a07b5a32e",
    name: "MEME",
    type: "partnership",
  },
] as const;

export type CompanyId = (typeof COMPANIES)[number]["id"];
export type Company = (typeof COMPANIES)[number];

type CompanyContextValue = {
  selectedCompanyId: CompanyId;
  selectedCompany: Company;
  setSelectedCompanyId: (companyId: CompanyId) => void;
  companies: readonly Company[];
};

const DEFAULT_COMPANY_ID: CompanyId = COMPANIES[0].id;

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyId] =
    useState<CompanyId>(DEFAULT_COMPANY_ID);

  const selectedCompany = useMemo(
    () =>
      COMPANIES.find((company) => company.id === selectedCompanyId) ??
      COMPANIES[0],
    [selectedCompanyId],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      selectedCompanyId,
      selectedCompany,
      setSelectedCompanyId,
      companies: COMPANIES,
    }),
    [selectedCompanyId, selectedCompany],
  );

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error("useCompany must be used inside CompanyProvider");
  }

  return context;
}
