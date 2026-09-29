from django.urls import path
from .views import LiquorClassifierView

urlpatterns = [
    path('classify/', LiquorClassifierView.as_view(), name='liquor-classify'),
]
