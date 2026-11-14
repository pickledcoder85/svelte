"""Barcode validation and normalisation for packaged foods (UPC-A, UPC-E, EAN-13, EAN-8, GTIN-14)."""

import re

_DIGITS = re.compile(r"^\d+$")


class InvalidBarcodeError(ValueError):
    pass


def gtin_check_digit_ok(code: str) -> bool:
    """GS1 mod-10 check, which UPC-A, EAN-13, EAN-8, and GTIN-14 all use."""
    if not _DIGITS.match(code) or len(code) < 8:
        return False
    body, check = code[:-1], int(code[-1])
    total = sum(int(digit) * (3 if index % 2 == 0 else 1) for index, digit in enumerate(reversed(body)))
    return (10 - total % 10) % 10 == check


def expand_upc_e(code: str) -> str:
    """Expand an 8-digit UPC-E (number system 0 or 1) to its 12-digit UPC-A form."""
    number_system, digits, check = code[0], code[1:7], code[7]
    last = digits[5]
    if last in "012":
        manufacturer, product = digits[0:2] + last + "00", "00" + digits[2:5]
    elif last == "3":
        manufacturer, product = digits[0:3] + "00", "000" + digits[3:5]
    elif last == "4":
        manufacturer, product = digits[0:4] + "0", "0000" + digits[4]
    else:
        manufacturer, product = digits[0:5], "0000" + last
    return number_system + manufacturer + product + check


def normalize_barcode(raw: str) -> str:
    """Return the 14-digit GTIN for a scanned code, or raise InvalidBarcodeError.

    8-digit codes are tried as EAN-8 first and as UPC-E (expanded to UPC-A) second.
    """
    code = re.sub(r"[\s-]", "", raw or "")
    if not _DIGITS.match(code) or len(code) not in (8, 12, 13, 14):
        raise InvalidBarcodeError("That doesn't look like a product barcode.")
    if len(code) == 8:
        if gtin_check_digit_ok(code):
            return code.zfill(14)
        if code[0] in "01":
            expanded = expand_upc_e(code)
            if gtin_check_digit_ok(expanded):
                return expanded.zfill(14)
        raise InvalidBarcodeError("That barcode didn't read correctly. Try again.")
    if not gtin_check_digit_ok(code):
        raise InvalidBarcodeError("That barcode didn't read correctly. Try again.")
    return code.zfill(14)


def lookup_forms(gtin14: str) -> list[str]:
    """Forms to try with external databases: EAN-13 first, then UPC-A or EAN-8 when they apply."""
    forms = [gtin14[1:]] if gtin14.startswith("0") else [gtin14]
    if gtin14.startswith("00"):
        forms.append(gtin14[2:])  # UPC-A
    if gtin14.startswith("000000"):
        forms.append(gtin14[6:])  # EAN-8
    return list(dict.fromkeys(forms))
