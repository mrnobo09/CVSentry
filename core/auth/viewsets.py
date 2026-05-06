from djoser.views import UserViewSet as DjoserUserViewSet


class CustomUserViewSet(DjoserUserViewSet):
    def initialize_request(self, request, *args, **kwargs):
        method = request.method.lower()
        if method == 'options':
            self.action = 'metadata'
        else:
            self.action = self.action_map.get(method)
        return super().initialize_request(request, *args, **kwargs)

    def get_authenticators(self):
        if self.action in ('create', 'activation', 'resend_activation'):
            return []
        return super().get_authenticators()
