# ── outputs.tf ──────────────────────────────────────────
# Outputs print useful info after Terraform finishes.
# Like a function's return value — after creating everything,
# Terraform tells you the IPs so you know where to connect.

output "rancher_public_ip" {
  description = "Public IP of the Rancher server"
  value       = azurerm_public_ip.rancher.ip_address
}

output "k8s_node_public_ip" {
  description = "Public IP of the K8s worker node"
  value       = azurerm_public_ip.k8s_node.ip_address
}

output "ssh_command_rancher" {
  description = "SSH command to connect to Rancher server"
  value       = "ssh -i ${path.module}/wanderer-key.pem ${var.admin_username}@${azurerm_public_ip.rancher.ip_address}"
}

output "ssh_command_k8s_node" {
  description = "SSH command to connect to K8s node"
  value       = "ssh -i ${path.module}/wanderer-key.pem ${var.admin_username}@${azurerm_public_ip.k8s_node.ip_address}"
}
