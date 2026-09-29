import os
import json
import logging
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from openai import OpenAI

logger = logging.getLogger(__name__)

class LiquorClassifierView(APIView):
    """
    API view to classify whether a given text/name represents a liquor/alcoholic beverage.
    Strictly uses OpenAI API (gpt-4o-mini) to analyze the query text with real location-based store lookup.
    """

    def post(self, request):
        name = request.data.get('name', '').strip()
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        location_name = request.data.get('location_name', '').strip()

        if not name:
            return Response(
                {"error": "Please provide a liquor name or text in the request body (e.g. {'name': 'Glenfiddich 12'})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY', '')

        if not api_key:
            return Response(
                {"error": "OPENAI_API_KEY is missing or empty in backend/.env."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if not location_name:
            location_name = "Kolkata, West Bengal"

        location_prompt_segment = f"User Specific Neighborhood / City Location: '{location_name}'."
        if latitude and longitude:
            location_prompt_segment += f" GPS Coordinates: Latitude {latitude}, Longitude {longitude}."

        try:
            client = OpenAI(api_key=api_key)
            model_name = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')

            system_prompt = (
                "You are an expert beverage sommelier, alcohol classification assistant, and local Kolkata liquor shop locator. "
                "Your task is to analyze the input text and determine whether it refers to an alcoholic beverage / liquor "
                "(whisky, vodka, rum, gin, tequila, beer, wine, brandy, liqueur, cocktail, cider, sake, etc.) or not.\n\n"
                f"CURRENT USER GEOLOCATION DATA:\n{location_prompt_segment}\n\n"
                "CRITICAL INSTRUCTIONS FOR REAL NEARBY STORES & PRICE:\n"
                f"1. Use the exact user location '{location_name}' provided above to identify REAL, ACCURATE nearby liquor off-shops, wine shops, FL licensed outlets, and supermarket liquor sections closest to that specific neighborhood.\n"
                f"2. Name real, actual off-shops and stores in '{location_name}' or surrounding 2-3km radius (e.g. if location is Salt Lake: name Salt Lake Sector 1/5 shops; if Park Street: name Park Street Perks/Camac St shops; if Gariahat: name Gariahat/Golpark shops; if Newtown/Howrah/Behala/Dum Dum: name stores in THAT specific area).\n"
                "3. Provide accurate Kolkata MRP prices in INR ₹ for standard bottle sizes.\n\n"
                "Return a JSON object with the following exact keys:\n"
                "- is_liquor: boolean (true if it is an alcoholic beverage / liquor, false otherwise)\n"
                "- confidence: string ('High', 'Medium', 'Low')\n"
                "- category: string (e.g. 'Whisky', 'Vodka', 'Beer', 'Wine', 'Non-Alcoholic', 'Soft Drink', 'Unknown')\n"
                "- detected_brand: string or null (the identified brand name, if applicable)\n"
                "- liquor_type: string (e.g. 'Spirits', 'Fermented Beverage', 'Cocktail', 'Liqueur', 'Non-Alcoholic Item')\n"
                "- approx_abv: string or null (approximate ABV percentage if standard/known, e.g., '40%' or '5%')\n"
                "- approx_price_kolkata: string or null (accurate estimated MRP/retail price in Kolkata, West Bengal in INR ₹, e.g., '₹3,950 (750ml)')\n"
                f"- nearby_stores_kolkata: string or null (real nearby liquor stores and licensed off-shops specifically closest to {location_name})\n"
                "- explanation: string (a concise 1-2 sentence detailed explanation of the classification)\n"
            )

            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Classify this beverage and list real nearby stores for '{location_name}': '{name}'"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )

            content = response.choices[0].message.content
            parsed = json.loads(content)

            return Response({
                "success": True,
                "query_text": name,
                "is_liquor": bool(parsed.get("is_liquor")),
                "confidence": parsed.get("confidence", "High"),
                "category": parsed.get("category", "Unknown"),
                "detected_brand": parsed.get("detected_brand"),
                "liquor_type": parsed.get("liquor_type", "N/A"),
                "approx_abv": parsed.get("approx_abv"),
                "approx_price_kolkata": parsed.get("approx_price_kolkata", "N/A"),
                "nearby_stores_kolkata": parsed.get("nearby_stores_kolkata", "Available at licensed FL off-shops near your location"),
                "explanation": parsed.get("explanation", ""),
                "source": f"OpenAI {model_name}",
                "api_key_status": "Valid OpenAI API Key Used"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            return Response(
                {"error": f"OpenAI API error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
