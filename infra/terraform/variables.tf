# ── variables.tf ────────────────────────────────────────
# Variables make your Terraform code reusable.
# Instead of hardcoding "westeurope" everywhere, you define it once here.
# Like function parameters — the actual values come from terraform.tfvars.

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string
  default     = "westeurope"
  # Azure has datacenters worldwide. "westeurope" = Netherlands.
  # Closest to Georgia would be "northeurope" (Ireland) or "westeurope".
  # You can change this to any Azure region.
}

variable "resource_group_name" {
  description = "Name of the resource group (container for all our resources)"
  type        = string
  default     = "wanderer-rg"
}

variable "vm_size" {
  description = "Size of the VMs (CPU + RAM combo)"
  type        = string
  default     = "Standard_B2s"
  # Standard_B2s = 2 vCPUs, 4 GB RAM — enough for Rancher + small K8s
  # "B" series = burstable (cheap, good for dev/learning)
  # Costs about ~$30/month but covered by free credit
}

variable "admin_username" {
  description = "SSH username for the VMs"
  type        = string
  default     = "azureuser"
}
