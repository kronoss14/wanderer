# ── providers.tf ────────────────────────────────────────
# Tells Terraform WHICH cloud provider to use and how to authenticate.
# Think of it like "import" in programming — you're importing the Azure plugin.

terraform {
  # Minimum Terraform version required
  required_version = ">= 1.0"

  required_providers {
    # azurerm = Azure Resource Manager — the plugin that lets Terraform talk to Azure
    azurerm = {
      source  = "hashicorp/azurerm"   # where to download the plugin from
      version = "~> 4.0"              # use version 4.x (~ means allow minor updates)
    }
  }
}

# Configure the Azure provider.
# Since we already ran "az login", Terraform uses that authentication automatically.
# No keys or tokens needed in the code — it reads from the Azure CLI session.
provider "azurerm" {
  features {}

  subscription_id = var.subscription_id
}
