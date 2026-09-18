import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserContactFields from "./UserContactFields";
import { prepareUserContactPayload } from "../utils/userContact";

const catalog = {
  countries: [
    { code: "AR", name: "Argentina", callingCode: "+54" },
    { code: "CL", name: "Chile", callingCode: "+56" },
    { code: "PE", name: "Perú", callingCode: "+51" },
    { code: "US", name: "Estados Unidos", callingCode: "+1" },
  ],
  chileRegions: [
    {
      code: "08",
      name: "Biobío",
      communes: [
        { code: "08101", name: "Concepción" },
        { code: "08102", name: "Coronel" },
      ],
    },
    {
      code: "13",
      name: "Metropolitana de Santiago",
      communes: [{ code: "13101", name: "Santiago" }],
    },
  ],
};

function ContactHarness({
  initialValue,
  error = null,
  catalogValue = catalog,
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <UserContactFields
        value={value}
        onChange={setValue}
        error={error}
        catalog={catalogValue}
      />
      <output data-testid="contact-state">{JSON.stringify(value)}</output>
    </>
  );
}

describe("UserContactFields", () => {
  it("shows country calling codes and the Chilean region and commune selectors", () => {
    render(
      <ContactHarness
        initialValue={{
          countryCode: "CL",
          regionCode: "",
          communeCode: "",
          phoneCountryCode: "CL",
          phone: "",
          addressLine: "",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "País" })).toHaveTextContent("Chile");
    expect(screen.getByLabelText("País del teléfono")).toHaveTextContent("+56");
    fireEvent.click(screen.getByLabelText("País del teléfono"));
    expect(
      screen.getByText("Busca por país o código para ver resultados."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar país del teléfono"), {
      target: { value: "Chile" },
    });
    expect(
      screen.getByRole("option", { name: "Chile (+56)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Región" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comuna" })).toBeDisabled();
  });

  it("pins Chile above the other matching phone countries", () => {
    render(
      <ContactHarness
        initialValue={{
          countryCode: null,
          regionCode: null,
          communeCode: null,
          phoneCountryCode: "CL",
          phone: "",
          addressLine: "",
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("País del teléfono"));
    fireEvent.change(screen.getByLabelText("Buscar país del teléfono"), {
      target: { value: "Perú" },
    });

    const listbox = screen.getByRole("listbox", {
      name: "Países para el teléfono",
    });
    const options = within(listbox).getAllByRole("option");
    expect(options[0]).toHaveAccessibleName("Chile (+56)");
    expect(options[1]).toHaveAccessibleName("Perú (+51)");
    expect(
      within(listbox).getByRole("separator", { name: "Otros países" }),
    ).toBeInTheDocument();
  });

  it("filters communes by region and clears commune when the region changes", () => {
    render(
      <ContactHarness
        initialValue={{
          countryCode: "CL",
          regionCode: "08",
          communeCode: "08101",
          phone: "",
          phoneCountryCode: "CL",
          addressLine: "",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Comuna" })).toHaveTextContent("Concepción");

    fireEvent.click(screen.getByRole("button", { name: "Región" }));
    expect(screen.getByText("Busca una región para ver resultados.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar región" }), {
      target: { value: "Metropolitana" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Metropolitana de Santiago" }));
    expect(screen.getByRole("button", { name: "Comuna" })).toHaveTextContent("Selecciona una comuna");

    fireEvent.click(screen.getByRole("button", { name: "Comuna" }));
    expect(screen.getByText("Busca una comuna para ver resultados.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar comuna" }), {
      target: { value: "Santiago" },
    });
    expect(screen.getByRole("option", { name: "Santiago" })).toBeInTheDocument();
  });

  it("clears and hides Chilean territory fields when country changes", () => {
    render(
      <ContactHarness
        initialValue={{
          countryCode: "CL",
          regionCode: "08",
          communeCode: "08101",
          phone: "",
          phoneCountryCode: "CL",
          addressLine: "Calle 1",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "País" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar país" }), {
      target: { value: "Argentina" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Argentina" }));
    expect(screen.queryByRole("button", { name: "Región" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comuna" })).not.toBeInTheDocument();
    expect(screen.getByTestId("contact-state")).toHaveTextContent(
      '"regionCode":null,"communeCode":null',
    );
    expect(screen.getByLabelText("País del teléfono")).toHaveTextContent("+56");
  });

  it("formats input and displays field-specific errors", () => {
    render(
      <ContactHarness
        initialValue={{
          countryCode: "CL",
          regionCode: "",
          communeCode: "",
          phoneCountryCode: "CL",
          phone: "",
          addressLine: "",
        }}
        error={{ message: "Teléfono inválido", field: "phone" }}
      />,
    );

    const phone = screen.getByLabelText(/Teléfono/);
    fireEvent.change(phone, { target: { value: "987654321" } });
    expect(phone).toHaveValue("9 8765 4321");
    expect(screen.getByText("Teléfono inválido")).toBeInTheDocument();
  });

  it("offers a retry when the catalog cannot be loaded", () => {
    const retry = vi.fn();
    render(
      <UserContactFields
        value={{}}
        onChange={() => {}}
        catalog={null}
        catalogError="Catálogo no disponible"
        onRetryCatalog={retry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("does not preload address countries and limits searched results", () => {
    const extraCountries = Array.from({ length: 12 }, (_, index) => ({
      code: `X${index}`,
      name: `País de prueba ${index + 1}`,
      callingCode: `+99${index}`,
    }));

    render(
      <ContactHarness
        catalogValue={{
          ...catalog,
          countries: [...catalog.countries, ...extraCountries],
        }}
        initialValue={{
          countryCode: null,
          regionCode: null,
          communeCode: null,
          phoneCountryCode: "CL",
          phone: "",
          addressLine: "",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "País" }));
    const listbox = screen.getByRole("listbox", { name: "Países" });
    expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Busca un país para ver resultados.")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar país" }), {
      target: { value: "País de prueba" },
    });
    expect(within(listbox).getAllByRole("option")).toHaveLength(10);
    expect(
      screen.getByText(
        "Hay 2 resultados ocultos. Haz una búsqueda más específica.",
      ),
    ).toBeInTheDocument();
  });
});

describe("prepareUserContactPayload", () => {
  it("returns E.164 and trims a valid Chilean address", () => {
    expect(
      prepareUserContactPayload(
        {
          countryCode: "CL",
          regionCode: "08",
          communeCode: "08101",
          addressLine: "  Los Carrera 1234  ",
          phoneCountryCode: "CL",
          phone: "9 8765 4321",
        },
        catalog,
      ),
    ).toEqual({
      countryCode: "CL",
      regionCode: "08",
      communeCode: "08101",
      addressLine: "Los Carrera 1234",
      phone: "+56987654321",
      phoneCountryCode: "CL",
    });
  });

  it("accepts an explicit foreign E.164 number and requires region for a Chilean address", () => {
    expect(
      prepareUserContactPayload(
        {
          countryCode: "CL",
          regionCode: null,
          communeCode: null,
          addressLine: null,
          phone: "+541112345678",
        },
        catalog,
      ).phone,
    ).toBe("+541112345678");

    expect(() =>
      prepareUserContactPayload(
        {
          countryCode: "CL",
          regionCode: null,
          communeCode: null,
          addressLine: "Calle 1",
          phone: null,
        },
        catalog,
      ),
    ).toThrow(/región/i);

    expect(() =>
      prepareUserContactPayload(
        {
          countryCode: "CL",
          regionCode: "08",
          communeCode: null,
          addressLine: "Calle 1",
          phone: null,
        },
        catalog,
      ),
    ).toThrow(/comuna/i);
  });

  it("rejects a commune from another region and clears territory abroad", () => {
    expect(() =>
      prepareUserContactPayload(
        {
          countryCode: "CL",
          regionCode: "08",
          communeCode: "13101",
          addressLine: null,
          phone: null,
        },
        catalog,
      ),
    ).toThrow(/comuna/i);

    expect(
      prepareUserContactPayload(
        {
          countryCode: "AR",
          regionCode: "08",
          communeCode: "08101",
          addressLine: "Calle 1",
          phone: null,
        },
        catalog,
      ),
    ).toMatchObject({ regionCode: null, communeCode: null });
  });

  it("uses the phone country independently from the address country", () => {
    expect(
      prepareUserContactPayload(
        {
          countryCode: "CL",
          regionCode: null,
          communeCode: null,
          addressLine: null,
          phoneCountryCode: "US",
          phone: "202 555 0123",
        },
        catalog,
      ),
    ).toMatchObject({
      countryCode: "CL",
      phoneCountryCode: "US",
      phone: "+12025550123",
    });
  });

  it("changing the phone country clears only the phone", () => {
    render(
      <ContactHarness
        initialValue={{
          countryCode: "CL",
          regionCode: "08",
          communeCode: "08101",
          addressLine: "Los Carrera 1234",
          phoneCountryCode: "CL",
          phone: "9 8765 4321",
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("País del teléfono"));
    fireEvent.change(screen.getByLabelText("Buscar país del teléfono"), {
      target: { value: "Estados Unidos" },
    });
    fireEvent.click(
      screen.getByRole("option", { name: "Estados Unidos (+1)" }),
    );
    expect(screen.getByLabelText(/Teléfono/)).toHaveValue("");
    expect(screen.getByTestId("contact-state")).toHaveTextContent(
      '"countryCode":"CL","regionCode":"08","communeCode":"08101","addressLine":"Los Carrera 1234","phoneCountryCode":"US","phone":""',
    );
  });

  it("shows at most ten searched countries and reports hidden results", () => {
    const extraCountries = Array.from({ length: 12 }, (_, index) => ({
      code: `X${index}`,
      name: `País de prueba ${index + 1}`,
      callingCode: `+99${index}`,
    }));

    render(
      <ContactHarness
        catalogValue={{
          ...catalog,
          countries: [...catalog.countries, ...extraCountries],
        }}
        initialValue={{
          countryCode: null,
          regionCode: null,
          communeCode: null,
          phoneCountryCode: "CL",
          phone: "",
          addressLine: "",
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("País del teléfono"));
    const listbox = screen.getByRole("listbox", {
      name: "Países para el teléfono",
    });
    expect(within(listbox).queryAllByRole("option")).toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Buscar país del teléfono"), {
      target: { value: "País de prueba" },
    });

    expect(within(listbox).getAllByRole("option")).toHaveLength(10);
    expect(
      screen.getByText(
        "Hay 3 resultados ocultos. Haz una búsqueda más específica.",
      ),
    ).toBeInTheDocument();
    expect(listbox).toHaveClass("max-h-44", "overflow-y-auto");
  });
});
