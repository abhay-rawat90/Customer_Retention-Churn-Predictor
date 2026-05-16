terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "retentionai-resources"
  location = "Central India"
}

resource "azurerm_container_registry" "acr" {
  name                = "retentionaiacr90"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
}


resource "azurerm_log_analytics_workspace" "law" {
  name                = "retentionailaw"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}


resource "azurerm_container_app_environment" "env" {
  name                       = "retentionai-env"
  location                   = azurerm_resource_group.rg.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
}


resource "azurerm_container_app" "app" {
  name                         = "retentionai-api"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  
  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "acr-password"
  }


  secret {
    name  = "acr-password"
    value = azurerm_container_registry.acr.admin_password
  }

  secret {
    name  = "gemini-api-key"
    value = var.gemini_api_key
  }

 
  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 7860
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }


  template {
    container {
      name   = "retention-backend"
      image  = "${azurerm_container_registry.acr.login_server}/retention-backend:v1"
      cpu    = 0.5
      memory = "1.0Gi"

      env {
        name        = "GEMINI_API_KEY"
        secret_name = "gemini-api-key"
      }
    }  
  }
}


output "live_api_url" {
  value = "https://${azurerm_container_app.app.latest_revision_fqdn}"
}