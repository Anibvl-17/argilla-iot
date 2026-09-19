import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserContactFields from "./UserContactFields";
import { prepareUserContactPayload } from "../utils/userContact";

const catalog = {
  countries: [
    { countryId: 1, isoCode: "AR", name: "Argentina", callingCode: "+54" },
    { countryId: 2, isoCode: "CL", name: "Chile", callingCode: "+56" },
    { countryId: 3, isoCode: "PE", name: "Perú", callingCode: "+51" },
    { countryId: 4, isoCode: "US", name: "Estados Unidos", callingCode: "+1" },
  ],
  regions: [
    {
      regionId: 8,
      countryId: 2,
      code: "08",
      name: "Biobío",
      communes: [
        { communeId: 801, regionId: 8, code: "08101", name: "Concepción" },
        { communeId: 802, regionId: 8, code: "08102", name: "Coronel" },
      ],
    },
    {
      regionId: 13,
      countryId: 2,
      code: "13",
      name: "Metropolitana de Santiago",
      communes: [{ communeId: 1301, regionId: 13, code: "13101", name: "Santiago" }],
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
          countryId: 2,
          regionId: null,
          communeId: null,
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
          countryId: null,
          regionId: null,
          communeId: null,
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
          countryId: 2,
          regionId: 8,
          communeId: 801,
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

  it("keeps the selected commune pinned above search results", () => {
    render(
      <ContactHarness
        initialValue={{
          countryId: 2,
          regionId: 8,
          communeId: 801,
          phone: "",
          phoneCountryCode: "CL",
          addressLine: "",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Comuna" }));
    const listbox = screen.getByRole("listbox", { name: "Comunas de la región" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(within(listbox).getByRole("option", { name: "Concepción" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar comuna" }), {
      target: { value: "Coronel" },
    });
    const options = within(listbox).getAllByRole("option");
    expect(options[0]).toHaveTextContent("Concepción");
    expect(options[1]).toHaveTextContent("Coronel");
    expect(
      within(listbox).getByRole("separator", { name: "Otros resultados" }),
    ).toBeInTheDocument();
  });

  it("pins the selected phone country instead of duplicating it", () => {
    render(
      <ContactHarness
        initialValue={{
          countryId: 1,
          regionId: null,
          communeId: null,
          phone: "",
          phoneCountryCode: "US",
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
    expect(options[0]).toHaveAccessibleName("Estados Unidos (+1)");
    expect(options[1]).toHaveAccessibleName("Perú (+51)");
  });

  it("clears and hides Chilean territory fields when country changes", () => {
    render(
      <ContactHarness
        initialValue={{
          countryId: 2,
          regionId: 8,
          communeId: 801,
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
      '"regionId":null,"communeId":null',
    );
    expect(screen.getByLabelText("País del teléfono")).toHaveTextContent("+56");
  });

  it("formats input and displays field-specific errors", () => {
    render(
      <ContactHarness
        initialValue={{
          countryId: 2,
          regionId: null,
          communeId: null,
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
      countryId: index + 10,
      isoCode: `X${index}`,
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
          countryId: null,
          regionId: null,
          communeId: null,
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
          countryId: 2,
          regionId: 8,
          communeId: 801,
          addressLine: "  Los Carrera 1234  ",
          phoneCountryCode: "CL",
          phone: "9 8765 4321",
        },
        catalog,
      ),
    ).toEqual({
      countryId: 2,
      regionId: 8,
      communeId: 801,
      addressLine: "Los Carrera 1234",
      phone: "+56987654321",
      phoneCountryCode: "CL",
    });
  });

  it("accepts an explicit foreign E.164 number and requires region for a Chilean address", () => {
    expect(
      prepareUserContactPayload(
        {
          countryId: 2,
          regionId: 8,
          communeId: 801,
          addressLine: null,
          phone: "+541112345678",
        },
        catalog,
      ).phone,
    ).toBe("+541112345678");

    expect(() =>
      prepareUserContactPayload(
        {
          countryId: 2,
          regionId: null,
          communeId: null,
          addressLine: "Calle 1",
          phone: null,
        },
        catalog,
      ),
    ).toThrow(/región/i);

    expect(() =>
      prepareUserContactPayload(
        {
          countryId: 2,
          regionId: 8,
          communeId: null,
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
          countryId: 2,
          regionId: 8,
          communeId: 1301,
          addressLine: null,
          phone: null,
        },
        catalog,
      ),
    ).toThrow(/comuna/i);

    expect(
      prepareUserContactPayload(
        {
          countryId: 1,
          regionId: 8,
          communeId: 801,
          addressLine: "Calle 1",
          phone: null,
        },
        catalog,
      ),
    ).toMatchObject({ regionId: null, communeId: null });
  });

  it("uses the phone country independently from the address country", () => {
    expect(
      prepareUserContactPayload(
        {
          countryId: 2,
          regionId: 8,
          communeId: 801,
          addressLine: null,
          phoneCountryCode: "US",
          phone: "202 555 0123",
        },
        catalog,
      ),
    ).toMatchObject({
      countryId: 2,
      phoneCountryCode: "US",
      phone: "+12025550123",
    });
  });

  it("changing the phone country clears only the phone", () => {
    render(
      <ContactHarness
        initialValue={{
          countryId: 2,
          regionId: 8,
          communeId: 801,
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
      '"countryId":2,"regionId":8,"communeId":801,"addressLine":"Los Carrera 1234","phoneCountryCode":"US","phone":""',
    );
  });

  it("shows at most ten searched countries and reports hidden results", () => {
    const extraCountries = Array.from({ length: 12 }, (_, index) => ({
      countryId: index + 10,
      isoCode: `X${index}`,
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
          countryId: null,
          regionId: null,
          communeId: null,
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
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(within(listbox).getByRole("option")).toHaveAccessibleName(
      "Chile (+56)",
    );

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
