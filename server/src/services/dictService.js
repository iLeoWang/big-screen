import { query } from "../db.js";

const mapRowsToDict = (typeRow, itemRows) => ({
  type: typeRow.type_code,
  description: typeRow.description || "",
  items: itemRows.map((item) => ({
    label: item.dict_label,
    value: item.dict_value,
    color: item.item_color || undefined,
    unit: item.item_unit || undefined,
  })),
});

export const getAllDicts = async () => {
  const typeRows = await query(
    `
      SELECT type_code, type_name, description
      FROM aq_dict_type
      WHERE status = 1
      ORDER BY sort_order ASC, id ASC
    `
  );

  if (!Array.isArray(typeRows) || typeRows.length === 0) {
    return [];
  }

  const itemRows = await query(
    `
      SELECT type_code, dict_label, dict_value, item_color, item_unit
      FROM aq_dict_item
      WHERE status = 1
      ORDER BY type_code ASC, sort_order ASC, id ASC
    `
  );

  const itemGroup = new Map();
  itemRows.forEach((row) => {
    const list = itemGroup.get(row.type_code) || [];
    list.push(row);
    itemGroup.set(row.type_code, list);
  });

  return typeRows.map((typeRow) => mapRowsToDict(typeRow, itemGroup.get(typeRow.type_code) || []));
};

export const getDictByType = async (type) => {
  const typeRows = await query(
    `
      SELECT type_code, type_name, description
      FROM aq_dict_type
      WHERE status = 1
        AND type_code = ?
      LIMIT 1
    `,
    [type]
  );

  const typeRow = typeRows[0];
  if (!typeRow) {
    return null;
  }

  const itemRows = await query(
    `
      SELECT dict_label, dict_value, item_color, item_unit
      FROM aq_dict_item
      WHERE status = 1
        AND type_code = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [type]
  );

  return mapRowsToDict(typeRow, itemRows);
};
